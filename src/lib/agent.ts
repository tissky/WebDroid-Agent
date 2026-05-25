import type {
  DeviceBackend,
  DeviceScreenshot,
  DeviceState,
  ExecuteActionOptions,
  InstalledApp,
} from '../adapters/deviceTypes'
import { buildActionPreview } from './actionPreview'
import type { AgentAction } from './actionTypes'
import { parseModelAction } from './actionParser'
import { createDefaultAppCards, resolveAppCard, type AppCardMap } from './appCards'
import type { ActionProtocol } from './actionProtocol'
import {
  customToolDescriptors,
  secretDescriptors,
  type CustomToolDefinition,
  type SecretRecord,
} from './agentResources'
import { createUnknownDeviceState } from './deviceState'
import type {
  AgentConversationMessage,
  AgentHistoryItem,
  CompletionRequest,
  ModelConfig,
  OpenAiClient,
} from './openAiTypes'
import { OpenAiClientError } from './openAiErrors'
import { compactScreenshotForMemory, mapActionCoordinates, modelScreenshotView } from './screenshot'
import { buildAgentPromptContext, compactThreadContext } from './contextBuilder'
import {
  createAgentThread,
  createConversationMessage,
  recordThreadFinalResponse,
  recordThreadTurnExecution,
  recordThreadUserMessage,
  startThreadTurn,
  updateThreadDeviceSnapshot,
  type AgentThread,
  type QueuedUserMessage,
} from './agentThread'
import {
  createDefaultActionToolRegistry,
  type ActionToolResult,
  type ActionToolRegistry,
} from './toolRegistry'

const MAX_AUTO_RECOVERABLE_EXECUTION_FAILURES = 2

export type AgentTiming = {
  captureMs: number
  currentAppMs: number
  modelMs: number
  parseMs: number
  totalMs: number
}

export type AgentStep = {
  index: number
  turnId?: string
  promptContext?: string
  screenshot: DeviceScreenshot
  currentApp: string
  deviceState: DeviceState
  modelOutput: string
  action: AgentAction
  executionAction: AgentAction
  preview: string
  timing: AgentTiming
  executionResult?: string
}

export type AgentDeviceSnapshot = {
  index: number
  screenshot: DeviceScreenshot
  currentApp: string
  deviceState: DeviceState
}

export type RunAgentStepInput = {
  device: DeviceBackend
  client: OpenAiClient
  modelConfig: ModelConfig
  actionProtocol?: ActionProtocol
  task: string
  unrestrictedMode?: boolean
  session?: AgentSession
  appCards?: AppCardMap
  customTools?: readonly CustomToolDefinition[]
  secrets?: readonly SecretRecord[]
  index?: number
  onSnapshot?: (snapshot: AgentDeviceSnapshot) => void | Promise<void>
  signal?: AbortSignal
}

export type AgentRunStatus =
  | 'awaiting_review'
  | 'awaiting_takeover'
  | 'done'
  | 'loop_guard'
  | 'max_steps'
  | 'stopped'

export type AgentRunResult = {
  status: AgentRunStatus
  steps: AgentStep[]
  reason?: string
  finalResponse?: string
}

export type AgentRunnerInput = {
  modelConfig: ModelConfig
  actionProtocol?: ActionProtocol
  task: string
  autoExecute: boolean
  maxSteps: number
  session?: AgentSession
  appCards?: AppCardMap
  customTools?: readonly CustomToolDefinition[]
  secrets?: readonly SecretRecord[]
  signal?: AbortSignal
  onSnapshot?: (snapshot: AgentDeviceSnapshot) => void | Promise<void>
  onStep?: (step: AgentStep) => void
  onExecuted?: (step: AgentStep, result: string) => void | Promise<void>
  onFinalResponse?: (response: string) => void | Promise<void>
  confirmSensitiveAction?: ExecuteActionOptions['confirmSensitiveAction']
  unrestrictedMode?: boolean
}

export type CreateAgentRunnerInput = {
  device: DeviceBackend
  client: OpenAiClient
  toolRegistry?: ActionToolRegistry
}

export type AgentSession = AgentThread

export function createAgentSession(task: string): AgentSession {
  return createAgentThread(task)
}

export function addUserMessage(session: AgentSession, message: string) {
  return recordThreadUserMessage(session, message)
}

export function queueUserMessage(session: AgentSession, message: string): QueuedUserMessage {
  const entry = addUserMessage(session, message)
  const queued = {
    id: entry.id,
    message: entry.content,
    queuedAtStep: session.stepNumber,
  }
  session.pendingUserMessages.push(queued)
  return queued
}

export function nextAgentStepIndex(session: AgentSession) {
  const latestHistoryStep = Math.max(0, ...session.history.map((item) => item.step))
  const latestTurnStep = Math.max(0, ...session.turns.map((turn) => turn.index))
  return Math.max(session.stepNumber, latestHistoryStep, latestTurnStep) + 1
}

export function recordAgentStep(
  session: AgentSession,
  step: AgentStep,
  executionResult?: string,
  success = executionResult === undefined ? undefined : true,
) {
  step.executionResult = executionResult
  session.stepNumber = Math.max(session.stepNumber, step.index)
  updateSessionDeviceSnapshot(session, {
    currentApp: step.currentApp,
    deviceState: step.deviceState,
    screenshot: step.screenshot,
  })

  if (step.turnId && session.turns.some((turn) => turn.id === step.turnId)) {
    recordThreadTurnExecution(session, step.turnId, {
      executionResult,
      success,
    })
    compactThreadContext(session)
    return
  }

  session.lastActionPreview = step.preview
  session.lastExecutionResult = executionResult
  if (step.action.action === 'done') {
    session.finished = true
    session.success = true
    session.progressSummary = step.action.summary ?? step.action.reason ?? 'Task completed.'
  }
  session.history.push({
    step: step.index,
    currentApp: step.currentApp,
    actionPreview: step.preview,
    executionResult,
  })
  if (success !== undefined) {
    session.actionOutcomes.push(success)
    if (!success && executionResult) {
      session.errorDescriptions.push(executionResult)
    }
  }
  if (executionResult) {
    session.messages.push(createConversationMessage('observation', executionResult))
  }
  compactThreadContext(session)
}

export async function recordAgentFinalResponse({
  client,
  modelConfig,
  session,
  task,
}: {
  client: OpenAiClient
  modelConfig: ModelConfig
  session: AgentSession
  task: string
}) {
  const fallback = session.progressSummary.trim() || 'Task completed.'
  let finalResponse = fallback

  if (client.completeFinalResponse) {
    try {
      finalResponse =
        (
          await client.completeFinalResponse({
            ...modelConfig,
            task,
            conversation: session.messages.map((message) => ({ ...message })),
            history: session.history.map((item) => ({ ...item })),
            currentApp: session.currentApp,
            deviceState: session.deviceState,
            progressSummary: session.progressSummary,
          })
        ).trim() || fallback
    } catch {
      finalResponse = fallback
    }
  }

  const message = recordThreadFinalResponse(session, finalResponse)
  compactThreadContext(session)
  return message.content
}

export async function runAgentStep({
  device,
  client,
  modelConfig,
  actionProtocol = 'webdroid_json',
  task,
  session,
  appCards = createDefaultAppCards(),
  customTools,
  index = 1,
  onSnapshot,
  secrets,
  signal,
  unrestrictedMode,
}: RunAgentStepInput): Promise<AgentStep> {
  if (signal?.aborted) {
    throw new DOMException('Run stopped.', 'AbortError')
  }
  const startedAt = now()
  const captureStartedAt = now()
  const screenshot = await device.screenshot()
  const captureMs = elapsed(captureStartedAt)
  const currentAppStartedAt = now()
  const deviceState = await getDeviceStateOrUnknown(device)
  const currentApp = deviceState.app
  const currentAppMs = elapsed(currentAppStartedAt)
  const modelScreenshot = modelScreenshotView(screenshot)
  const retainedScreenshot = compactScreenshotForMemory(screenshot)
  await onSnapshot?.({
    index,
    screenshot: retainedScreenshot,
    currentApp,
    deviceState,
  })
  const installedApps = await getInstalledAppsOrEmpty(device)
  if (signal?.aborted) {
    throw new DOMException('Run stopped.', 'AbortError')
  }
  const modelStartedAt = now()
  if (session) {
    session.stepNumber = Math.max(session.stepNumber, index)
    updateSessionDeviceSnapshot(session, {
      currentApp,
      deviceState,
      screenshot: retainedScreenshot,
    })
  }
  const pendingUserMessages = session ? [...session.pendingUserMessages] : []
  const appCard = resolveAppCard(appCards, deviceState.packageName)
  const promptCustomTools = customToolDescriptors(customTools ?? [])
  const promptSecrets = secretDescriptors(secrets ?? [])
  const builtContext = buildAgentPromptContext({
    thread: session,
    task,
    latestUserMessage: session ? latestUserMessage(session.messages) : undefined,
    pendingUserMessages: pendingUserMessages.map((message) => message.message),
    screen: modelScreenshot.screen,
    deviceScreen: screenshot.screen,
    currentApp,
    deviceState,
    appCard,
    customTools: promptCustomTools,
    installedApps,
    secrets: promptSecrets,
  })
  const promptContext = builtContext.text
  const completionRequest: CompletionRequest = {
    ...modelConfig,
    actionProtocol,
    task,
    conversation: session?.messages,
    screenshotDataUrl: modelScreenshot.dataUrl,
    screen: modelScreenshot.screen,
    deviceScreen: screenshot.screen,
    currentApp,
    deviceState,
    history: builtContext.history,
    appCard,
    customTools: promptCustomTools,
    installedApps,
    secrets: promptSecrets,
    promptContext,
    unrestrictedMode,
    signal,
  }
  let modelOutput = await completeActionWithEmptyContentRetry(client, completionRequest)
  let modelMs = elapsed(modelStartedAt)
  let parseStartedAt = now()
  let action = parseActionOrError(modelOutput, modelScreenshot.screen)
  let parseMs = elapsed(parseStartedAt)

  if (action instanceof Error) {
    if (!client.repairAction) {
      throw action
    }

    const repairStartedAt = now()
    modelOutput = await client.repairAction({
      ...completionRequest,
      invalidOutput: modelOutput,
      validationError: action.message,
    })
    modelMs += elapsed(repairStartedAt)

    parseStartedAt = now()
    action = parseModelAction(modelOutput, modelScreenshot.screen)
    parseMs += elapsed(parseStartedAt)
  }

  const executionAction = mapActionCoordinates(action, modelScreenshot.screen, screenshot.screen)
  const preview = buildActionPreview(action)
  const timing = {
    captureMs,
    currentAppMs,
    modelMs,
    parseMs,
    totalMs: elapsed(startedAt),
  }
  const turn = session
    ? startThreadTurn(session, {
        index,
        task,
        latestUserMessage: latestUserMessage(session.messages),
        promptContext,
        deviceSnapshot: { currentApp, deviceState, screenshot: retainedScreenshot },
        modelOutput,
        action,
        executionAction,
        preview,
        timing,
      })
    : undefined
  if (session) {
    markPendingUserMessagesConsumed(session, pendingUserMessages)
  }

  return {
    index,
    turnId: turn?.id,
    promptContext,
    screenshot: retainedScreenshot,
    currentApp,
    deviceState,
    modelOutput,
    action,
    executionAction,
    preview,
    timing,
  }
}

function parseActionOrError(raw: string, screen: DeviceScreenshot['screen']) {
  try {
    return parseModelAction(raw, screen)
  } catch (caught) {
    return caught instanceof Error ? caught : new Error(String(caught))
  }
}

async function completeActionWithEmptyContentRetry(
  client: OpenAiClient,
  request: CompletionRequest,
) {
  try {
    return await client.completeAction(request)
  } catch (caught) {
    if (!isEmptyAssistantContentError(caught) || request.signal?.aborted) {
      throw caught
    }

    return client.completeAction({
      ...request,
      conversation: [],
      history: request.history?.slice(-6),
      stream: false,
      promptContext: [
        request.promptContext,
        emptyContentRetryInstruction(request.actionProtocol),
      ]
        .filter(Boolean)
        .join('\n'),
    })
  }
}

function emptyContentRetryInstruction(actionProtocol: CompletionRequest['actionProtocol']) {
  const prefix = [
    'The previous model response for this exact screenshot was empty.',
    'Use the screenshot and compact context above, then return exactly one valid',
  ].join(' ')
  if (actionProtocol === 'open_autoglm_function') {
    return `${prefix} Open-AutoGLM <think>...</think><answer>...</answer> action.`
  }
  if (actionProtocol === 'mobilerun_xml') {
    return `${prefix} mobilerun <function_calls>...</function_calls> tool call block.`
  }
  return `${prefix} JSON action object.`
}

function isEmptyAssistantContentError(error: unknown) {
  return (
    error instanceof OpenAiClientError &&
    /No assistant content returned by model/i.test(error.message)
  )
}

export function createAgentRunner({
  device,
  client,
  toolRegistry = createDefaultActionToolRegistry(),
}: CreateAgentRunnerInput) {
  return {
    async run(input: AgentRunnerInput): Promise<AgentRunResult> {
      const steps: AgentStep[] = []
      const session = input.session ?? createAgentSession(input.task)
      const startIndex = nextAgentStepIndex(session)
      let recoverableExecutionFailures = 0

      for (let offset = 0; offset < input.maxSteps; offset += 1) {
        const index = startIndex + offset
        if (input.signal?.aborted) {
          return { status: 'stopped', steps }
        }

        let step: AgentStep
        try {
          step = await runAgentStep({
            device,
            client,
            modelConfig: input.modelConfig,
            actionProtocol: input.actionProtocol,
            task: input.task,
            session,
            appCards: input.appCards,
            customTools: input.customTools,
            index,
            onSnapshot: input.onSnapshot,
            secrets: input.secrets,
            signal: input.signal,
            unrestrictedMode: input.unrestrictedMode,
          })
        } catch (caught) {
          if (input.signal?.aborted || isAbortError(caught)) {
            return { status: 'stopped', steps }
          }
          throw caught
        }
        if (input.signal?.aborted) {
          return { status: 'stopped', steps }
        }
        steps.push(step)
        input.onStep?.(step)

        if (step.action.action === 'done') {
          recordAgentStep(session, step)
          if (session.pendingUserMessages.length > 0) {
            continue
          }
          const finalResponse = await recordAgentFinalResponse({
            client,
            modelConfig: input.modelConfig,
            session,
            task: input.task,
          })
          await input.onFinalResponse?.(finalResponse)
          return { status: 'done', steps, finalResponse }
        }

        if (step.action.action === 'take_over' && !input.unrestrictedMode) {
          recordAgentStep(session, step)
          return { status: 'awaiting_takeover', steps }
        }

        const loopSignal = detectLoopGuard(session, step)
        if (loopSignal) {
          recordAgentStep(session, step, loopSignal)
          return { status: 'loop_guard', steps, reason: loopSignal }
        }

        if (!input.autoExecute) {
          return { status: 'awaiting_review', steps }
        }

        if (input.signal?.aborted) {
          return { status: 'stopped', steps }
        }

        const result = await toolRegistry.execute(step.executionAction, {
          device,
          confirmSensitiveAction: input.confirmSensitiveAction,
          unrestrictedMode: input.unrestrictedMode,
          safetyContext: {
            task: input.task,
            currentApp: step.currentApp,
            deviceState: step.deviceState,
            modelOutput: step.modelOutput,
          },
          customTools: input.customTools,
          secrets: input.secrets,
        })
        if (input.signal?.aborted) {
          return { status: 'stopped', steps }
        }
        recordAgentStep(session, step, result.summary, result.success)
        await input.onExecuted?.(step, result.summary)
        if (!result.success) {
          if (result.safetyDecision === 'take_over') {
            return { status: 'awaiting_takeover', steps, reason: result.summary }
          }
          if (!isAutoRecoverableExecutionFailure(result)) {
            return { status: 'awaiting_review', steps, reason: result.summary }
          }

          recoverableExecutionFailures += 1
          if (recoverableExecutionFailures > MAX_AUTO_RECOVERABLE_EXECUTION_FAILURES) {
            return { status: 'awaiting_review', steps, reason: result.summary }
          }
          continue
        }
        recoverableExecutionFailures = 0
      }

      return { status: 'max_steps', steps }
    },
  }
}

function isAutoRecoverableExecutionFailure(result: ActionToolResult) {
  return !result.safetyDecision
}

function markPendingUserMessagesConsumed(
  session: AgentSession,
  consumedMessages: readonly QueuedUserMessage[],
) {
  if (consumedMessages.length === 0) {
    return
  }

  const consumedIds = new Set(consumedMessages.map((message) => message.id))
  session.pendingUserMessages = session.pendingUserMessages.filter(
    (message) => !consumedIds.has(message.id),
  )
}

function isAbortError(caught: unknown) {
  return (
    (caught instanceof DOMException && caught.name === 'AbortError') ||
    (caught instanceof Error && caught.name === 'AbortError')
  )
}

function updateSessionDeviceSnapshot(
  session: AgentSession,
  snapshot: {
    currentApp: string
    deviceState: DeviceState
    screenshot?: DeviceScreenshot
  },
) {
  updateThreadDeviceSnapshot(session, snapshot)
}

function now() {
  return performance.now()
}

function elapsed(startedAt: number) {
  return Math.round(performance.now() - startedAt)
}

function latestUserMessage(conversation: readonly AgentConversationMessage[]) {
  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    const message = conversation[index]
    if (message.role === 'user' && message.content.trim()) {
      return message.content.trim()
    }
  }
  return undefined
}

function detectLoopGuard(session: AgentSession, step: AgentStep) {
  const repeatedPreviewCount = countConsecutive(
    session.history,
    (item) => item.actionPreview === step.preview,
  )
  if (repeatedPreviewCount >= 3) {
    return `Stopped before repeating "${step.preview}" a fourth time.`
  }

  if (step.action.action === 'wait') {
    const waitCount = countConsecutive(session.history, (item) =>
      item.actionPreview.startsWith('wait '),
    )
    if (waitCount >= 3) {
      return 'Stopped before executing a fourth consecutive wait action.'
    }
  }

  return null
}

function countConsecutive(
  history: readonly AgentHistoryItem[],
  predicate: (item: AgentHistoryItem) => boolean,
) {
  let count = 0
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (!predicate(history[index])) {
      break
    }
    count += 1
  }
  return count
}

async function getDeviceStateOrUnknown(device: DeviceBackend): Promise<DeviceState> {
  try {
    return await device.getDeviceState()
  } catch {
    return createUnknownDeviceState()
  }
}

async function getInstalledAppsOrEmpty(device: DeviceBackend): Promise<InstalledApp[]> {
  if (!device.getInstalledApps) {
    return []
  }

  try {
    return await device.getInstalledApps()
  } catch {
    return []
  }
}
