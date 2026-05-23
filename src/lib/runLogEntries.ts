import type { DeviceScreenshot, DeviceState } from '../adapters/deviceTypes'
import { buildActionPreview } from './actionPreview'
import type { ScreenSize } from './actionTypes'
import type { AgentStep } from './agent'
import { formatDeviceState } from './deviceState'
import { modelScreenshotView } from './screenshotCoordinates'

export type LogScreenshot = {
  dataUrl: string
  screen: ScreenSize
}

export type LogEntry = {
  id: number
  time: string
  tone: 'info' | 'ok' | 'warn' | 'error'
  title: string
  detail?: string
  screenshot?: LogScreenshot
  timeline?: {
    step?: number
    currentApp?: string
    packageName?: string
    modelOutput?: string
    actionPreview?: string
    executionActionPreview?: string
    executionResult?: string
  }
}

export type LogEntryInput = Omit<LogEntry, 'id' | 'time'>

export function createRunLogEntry(
  entry: LogEntryInput,
  date = new Date(),
  id = date.getTime() + Math.random(),
): LogEntry {
  return {
    ...entry,
    id,
    time: new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date),
  }
}

export function formatScreenCaptureDetail(
  screenshot: DeviceScreenshot,
  deviceState: DeviceState,
) {
  const screenshotSize = `${screenshot.screen.width}x${screenshot.screen.height}`
  return [screenshotSize, formatDeviceState(deviceState)].join('\n')
}

export function formatAgentStepDetail(step: AgentStep) {
  const timingDetail = [
    `capture ${step.timing.captureMs}ms`,
    `app ${step.timing.currentAppMs}ms`,
    `model ${step.timing.modelMs}ms`,
    `parse ${step.timing.parseMs}ms`,
    `total ${step.timing.totalMs}ms`,
  ].join(', ')

  return [
    `Current app: ${step.currentApp}`,
    `Timing: ${timingDetail}`,
    step.modelOutput,
  ].join('\n\n')
}

export function buildAgentStepTimeline(
  step: AgentStep,
  executionResult?: string,
): LogEntry['timeline'] {
  return {
    step: step.index,
    currentApp: step.currentApp,
    packageName: step.deviceState.packageName,
    modelOutput: step.modelOutput,
    actionPreview: buildActionPreview(step.action),
    executionActionPreview: buildActionPreview(step.executionAction),
    executionResult,
  }
}

export function toLogScreenshot(
  value: DeviceScreenshot | null | undefined,
): LogScreenshot | undefined {
  if (!value) {
    return undefined
  }

  const view = modelScreenshotView(value)
  return {
    dataUrl: view.dataUrl,
    screen: view.screen,
  }
}
