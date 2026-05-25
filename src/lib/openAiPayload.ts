import { buildSystemPrompt } from './prompts'
import { buildAgentPromptContext } from './contextBuilder'
import { UNKNOWN_APP_NAME } from './deviceState'
import type {
  AgentConversationMessage,
  ChatCompletionPayload,
  ChatMessage,
  CompletionRequest,
  FinalResponseRequest,
  UserContent,
} from './openAiTypes'
import { formatPromptHistoryItem } from './promptContextFormatting'

export const MAX_PROMPT_CONVERSATION_MESSAGES = 16

export function buildChatCompletionPayload({
  model,
  task,
  conversation,
  screenshotDataUrl,
  screen,
  deviceScreen,
  currentApp,
  deviceState,
  history = [],
  appCard,
  actionProtocol = 'webdroid_json',
  customTools,
  installedApps,
  promptContext,
  secrets,
  unrestrictedMode,
  stream,
}: Pick<
  CompletionRequest,
  | 'model'
  | 'task'
  | 'conversation'
  | 'screenshotDataUrl'
  | 'screen'
  | 'deviceScreen'
  | 'currentApp'
  | 'deviceState'
  | 'history'
  | 'appCard'
  | 'actionProtocol'
  | 'customTools'
  | 'installedApps'
  | 'promptContext'
  | 'secrets'
  | 'unrestrictedMode'
  | 'stream'
>): ChatCompletionPayload {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildSystemPrompt({ actionProtocol, unrestrictedMode }),
    },
  ]

  const context =
    promptContext ??
    buildAgentPromptContext({
      task,
      history,
      screen,
      deviceScreen,
      currentApp,
      deviceState,
      appCard,
      customTools,
      installedApps,
      secrets,
      latestUserMessage: latestUserMessage(conversation),
    }).text
  const conversationMessages = selectConversationMessagesForPrompt(conversation)

  if (conversationMessages.length > 0) {
    for (const message of conversationMessages) {
      messages.push(toChatMessage(message))
    }
    const lastUserIndex = findLastUserMessageIndex(messages)
    if (lastUserIndex >= 0) {
      const lastUser = messages[lastUserIndex]
      if (lastUser.role === 'user') {
        const text = userContentText(lastUser.content)
        lastUser.content = [
          {
            type: 'text',
            text: [text, context].filter(Boolean).join('\n\n'),
          },
          {
            type: 'image_url',
            image_url: { url: screenshotDataUrl },
          },
        ]
      }
    } else {
      messages.push(multimodalUserMessage(context, screenshotDataUrl))
    }
  } else {
    messages.push(multimodalUserMessage(context, screenshotDataUrl))
  }

  const payload: ChatCompletionPayload = {
    model,
    temperature: 0.1,
    max_tokens: 800,
    ...(actionProtocol === 'webdroid_json'
      ? { response_format: { type: 'json_object' as const } }
      : {}),
    ...(stream ? { stream: true } : {}),
    messages,
  }

  return payload
}

function selectConversationMessagesForPrompt(conversation?: readonly AgentConversationMessage[]) {
  const messages = conversation?.filter((message) => message.content.trim()) ?? []
  if (messages.length <= MAX_PROMPT_CONVERSATION_MESSAGES) {
    return messages
  }

  const firstUser = messages.find((message) => message.role === 'user')
  const recentMessages = messages.slice(-MAX_PROMPT_CONVERSATION_MESSAGES)
  if (!firstUser || recentMessages.some((message) => message.id === firstUser.id)) {
    return recentMessages
  }

  return [firstUser, ...recentMessages]
}

export function buildFinalResponsePayload({
  model,
  task,
  conversation,
  history = [],
  currentApp,
  deviceState,
  progressSummary,
  stream,
}: Pick<
  FinalResponseRequest,
  | 'model'
  | 'task'
  | 'conversation'
  | 'history'
  | 'currentApp'
  | 'deviceState'
  | 'progressSummary'
  | 'stream'
>): ChatCompletionPayload {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildFinalResponseSystemPrompt(),
    },
  ]

  for (const message of conversation?.filter((item) => item.content.trim()) ?? []) {
    messages.push(toChatMessage(message))
  }

  messages.push({
    role: 'user',
    content: buildFinalResponseContext({
      task,
      history,
      currentApp,
      deviceState,
      progressSummary,
    }),
  })

  return {
    model,
    temperature: 0.2,
    max_tokens: 700,
    ...(stream ? { stream: true } : {}),
    messages,
  }
}

function buildFinalResponseSystemPrompt() {
  return [
    'You are WebDroid Agent writing the final user-facing answer after completing Android control steps.',
    'Write concise natural language, like a Codex final response after tool steps complete.',
    'Do not return JSON. Markdown is allowed.',
    'State what was completed, mention any important caveat only if the recorded steps show one, and avoid inventing unseen results.',
  ].join('\n')
}

function buildFinalResponseContext({
  task,
  history,
  currentApp,
  deviceState,
  progressSummary,
}: Pick<
  FinalResponseRequest,
  'task' | 'history' | 'currentApp' | 'deviceState' | 'progressSummary'
>) {
  const lines = [
    `Original task: ${task}`,
    progressSummary ? `Completion summary: ${progressSummary}` : null,
    `Current app: ${currentApp ?? deviceState?.app ?? UNKNOWN_APP_NAME}`,
    deviceState?.packageName ? `Package: ${deviceState.packageName}` : null,
    'Write the final answer now.',
  ].filter(Boolean) as string[]

  if (history && history.length > 0) {
    lines.push('', 'Completed steps:')
    for (const item of history.slice(-12)) {
      lines.push(formatPromptHistoryItem(item))
    }
  }

  return lines.join('\n')
}

function multimodalUserMessage(text: string, screenshotDataUrl: string): ChatMessage {
  return {
    role: 'user',
    content: [
      {
        type: 'text',
        text,
      },
      {
        type: 'image_url',
        image_url: { url: screenshotDataUrl },
      },
    ],
  }
}

function toChatMessage(message: AgentConversationMessage): ChatMessage {
  if (message.role === 'assistant') {
    return {
      role: 'assistant',
      content: message.content,
    }
  }

  if (message.role === 'observation') {
    return {
      role: 'user',
      content: `<observation>\n${message.content}\n</observation>`,
    }
  }

  return {
    role: 'user',
    content: message.content,
  }
}

function findLastUserMessageIndex(messages: readonly ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') {
      return index
    }
  }
  return -1
}

function latestUserMessage(conversation?: readonly AgentConversationMessage[]) {
  if (!conversation) {
    return undefined
  }
  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    const message = conversation[index]
    if (message.role === 'user' && message.content.trim()) {
      return message.content.trim()
    }
  }
  return undefined
}

function userContentText(content: UserContent) {
  if (typeof content === 'string') {
    return content
  }
  return content
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('\n')
    .trim()
}
