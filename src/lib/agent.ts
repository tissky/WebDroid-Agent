import type { DeviceBackend, DeviceScreenshot } from '../adapters/deviceBackend'
import { type AgentAction, buildActionPreview, parseModelAction } from './actions'
import type { ModelConfig, OpenAiClient } from './openAiClient'

export type AgentStep = {
  index: number
  screenshot: DeviceScreenshot
  modelOutput: string
  action: AgentAction
  preview: string
}

export type RunAgentStepInput = {
  device: DeviceBackend
  client: OpenAiClient
  modelConfig: ModelConfig
  task: string
  index?: number
}

export type AgentRunStatus =
  | 'awaiting_review'
  | 'awaiting_takeover'
  | 'done'
  | 'max_steps'
  | 'stopped'

export type AgentRunResult = {
  status: AgentRunStatus
  steps: AgentStep[]
}

export type AgentRunnerInput = {
  modelConfig: ModelConfig
  task: string
  autoExecute: boolean
  maxSteps: number
  signal?: AbortSignal
  onStep?: (step: AgentStep) => void
  onExecuted?: (step: AgentStep, result: string) => void
}

export async function runAgentStep({
  device,
  client,
  modelConfig,
  task,
  index = 1,
}: RunAgentStepInput): Promise<AgentStep> {
  const screenshot = await device.screenshot()
  const modelOutput = await client.completeAction({
    ...modelConfig,
    task,
    screenshotDataUrl: screenshot.dataUrl,
    screen: screenshot.screen,
  })
  const action = parseModelAction(modelOutput, screenshot.screen)

  return {
    index,
    screenshot,
    modelOutput,
    action,
    preview: buildActionPreview(action),
  }
}

export function createAgentRunner({
  device,
  client,
}: {
  device: DeviceBackend
  client: OpenAiClient
}) {
  return {
    async run(input: AgentRunnerInput): Promise<AgentRunResult> {
      const steps: AgentStep[] = []

      for (let index = 1; index <= input.maxSteps; index += 1) {
        if (input.signal?.aborted) {
          return { status: 'stopped', steps }
        }

        const step = await runAgentStep({
          device,
          client,
          modelConfig: input.modelConfig,
          task: input.task,
          index,
        })
        steps.push(step)
        input.onStep?.(step)

        if (step.action.action === 'done') {
          return { status: 'done', steps }
        }

        if (step.action.action === 'take_over') {
          return { status: 'awaiting_takeover', steps }
        }

        if (!input.autoExecute) {
          return { status: 'awaiting_review', steps }
        }

        const result = await device.execute(step.action)
        input.onExecuted?.(step, result)
      }

      return { status: 'max_steps', steps }
    },
  }
}
