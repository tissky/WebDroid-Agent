import type { DeviceState, InstalledApp } from '../adapters/deviceTypes'
import type { ScreenSize } from './actionTypes'
import {
  addThreadEvent,
  type AgentThread,
  type AgentTurn,
} from './agentThread'
import type { AgentHistoryItem } from './openAiTypes'
import type { CustomToolDescriptor, SecretDescriptor } from './agentResources'
import {
  buildPromptScreenInfo,
  CANONICAL_COORDINATE_INSTRUCTION,
  formatInstalledAppsForPrompt,
  formatPromptHistoryItem,
} from './promptContextFormatting'

export type BuildAgentPromptContextInput = {
  thread?: AgentThread
  task: string
  history?: readonly AgentHistoryItem[]
  latestUserMessage?: string
  screen: ScreenSize
  deviceScreen?: ScreenSize
  currentApp?: string
  deviceState?: DeviceState
  appCard?: string
  customTools?: readonly CustomToolDescriptor[]
  installedApps?: readonly InstalledApp[]
  maxRecentTurns?: number
  pendingUserMessages?: readonly string[]
  secrets?: readonly SecretDescriptor[]
}

export type BuiltAgentPromptContext = {
  text: string
  history: AgentHistoryItem[]
  latestUserMessage?: string
}

export function buildAgentPromptContext({
  thread,
  task,
  history: fallbackHistory,
  latestUserMessage,
  screen,
  deviceScreen,
  currentApp,
  deviceState,
  appCard,
  customTools,
  installedApps,
  maxRecentTurns = 12,
  pendingUserMessages,
  secrets,
}: BuildAgentPromptContextInput): BuiltAgentPromptContext {
  const history = thread
    ? historyFromRecentTurns(thread, maxRecentTurns)
    : (fallbackHistory ?? []).slice(-maxRecentTurns)
  const screenInfo = buildPromptScreenInfo({ currentApp, deviceScreen, deviceState, screen })

  const lines = [
    `Task: ${task}`,
    latestUserMessage ? `Latest user message: ${latestUserMessage}` : null,
    formatPendingUserMessages(pendingUserMessages),
    thread?.contextSummary ? `<context_summary>\n${thread.contextSummary}\n</context_summary>` : null,
    thread ? formatRecentActionErrors(thread) : null,
    `Screen Info: ${screenInfo}`,
    appCard ? `<app_card>\n${appCard}\n</app_card>` : null,
    formatCustomToolsForPrompt(customTools),
    formatSecretsForPrompt(secrets),
    formatInstalledAppsForPrompt(
      installedApps,
      [task, latestUserMessage, pendingUserMessages?.join('\n')].join('\n'),
    ),
    'Treat the latest user message as the current instruction. Use earlier messages, observations, and context summary only as context.',
    'If a recent action failed, use its feedback to choose a different recovery action; do not repeat the exact same failed action.',
    CANONICAL_COORDINATE_INSTRUCTION,
  ].filter(Boolean) as string[]

  if (history.length > 0) {
    lines.push('Previous steps:')
    for (const item of history) {
      lines.push(formatPromptHistoryItem(item))
    }
  }

  return {
    text: lines.join('\n'),
    history,
    latestUserMessage,
  }
}

function formatCustomToolsForPrompt(customTools?: readonly CustomToolDescriptor[]) {
  const tools = customTools?.filter((tool) => tool.name.trim() && tool.description.trim()) ?? []
  if (tools.length === 0) {
    return null
  }

  return [
    '<available_custom_tools>',
    ...tools.map((tool) => `${tool.name}: ${tool.description}`),
    '</available_custom_tools>',
  ].join('\n')
}

function formatSecretsForPrompt(secrets?: readonly SecretDescriptor[]) {
  const records = secrets?.filter((secret) => secret.id.trim()) ?? []
  if (records.length === 0) {
    return null
  }

  return [
    '<available_secrets>',
    ...records.map((secret) => `${secret.id}: ${secret.label || secret.id}`),
    '</available_secrets>',
    'Use type_secret with a listed secret id when a secret value must be typed. Secret values are local and are never shown to the model.',
  ].join('\n')
}

export function historyFromRecentTurns(thread: AgentThread, maxRecentTurns = 12) {
  const completedTurns = thread.turns.filter(isCompletedTurn)
  if (completedTurns.length === 0) {
    return thread.history.slice(-maxRecentTurns)
  }
  return completedTurns.slice(-maxRecentTurns).map(turnToHistoryItem)
}

export function compactThreadContext(
  thread: AgentThread,
  options: { keepRecentTurns?: number; now?: number } = {},
) {
  const keepRecentTurns = options.keepRecentTurns ?? 12
  const completedTurns = thread.turns.filter(isCompletedTurn)
  const compactableTurns = completedTurns.slice(0, Math.max(0, completedTurns.length - keepRecentTurns))
  const turnsToCompact = compactableTurns.filter(
    (turn) => turn.index > thread.contextCompactedThroughStep,
  )

  if (turnsToCompact.length === 0) {
    return null
  }

  const summary = turnsToCompact.map(formatTurnSummary).join('\n')
  thread.contextSummary = [thread.contextSummary, summary].filter(Boolean).join('\n')
  thread.memory = thread.contextSummary ? [thread.contextSummary] : []
  thread.contextCompactedThroughStep = turnsToCompact.at(-1)?.index ?? thread.contextCompactedThroughStep
  for (const turn of turnsToCompact) {
    turn.compacted = true
    turn.promptContext = ''
  }
  addThreadEvent(
    thread,
    {
      type: 'context_compaction',
      summary,
      compactedThroughStep: thread.contextCompactedThroughStep,
    },
    { now: options.now },
  )

  return summary
}

function turnToHistoryItem(turn: AgentTurn): AgentHistoryItem {
  return {
    step: turn.index,
    currentApp: turn.deviceSnapshot.currentApp,
    actionPreview: turn.preview,
    executionResult: turn.executionResult,
  }
}

function isCompletedTurn(turn: AgentTurn) {
  return turn.status !== 'planned'
}

function formatTurnSummary(turn: AgentTurn) {
  return formatPromptHistoryItem(turnToHistoryItem(turn))
}

function formatRecentActionErrors(thread: AgentThread) {
  const failedTurns = thread.turns
    .filter((turn) => isCompletedTurn(turn) && (turn.status === 'failed' || turn.success === false))
    .slice(-5)
  if (failedTurns.length === 0) {
    return null
  }

  return [
    '<recent_action_errors>',
    ...failedTurns.map((turn) =>
      [
        `- Step ${turn.index}`,
        `action=${turn.preview}`,
        turn.executionResult ? `feedback=${turn.executionResult}` : null,
      ]
        .filter(Boolean)
        .join(' | '),
    ),
    '</recent_action_errors>',
  ].join('\n')
}

function formatPendingUserMessages(messages?: readonly string[]) {
  const pendingMessages = messages?.map((message) => message.trim()).filter(Boolean) ?? []
  if (pendingMessages.length === 0) {
    return null
  }

  return [
    '<pending_user_messages>',
    ...pendingMessages.map((message) => `- ${message}`),
    '</pending_user_messages>',
  ].join('\n')
}
