import type { AgentAction } from '../lib/actionTypes'
import { DeviceBackendError, type ExecuteActionOptions } from './deviceTypes'

export function getSensitiveActionMessage(action: AgentAction): string | null {
  if (action.action !== 'tap') {
    return null
  }

  if (action.message) {
    return action.message
  }

  if (action.risk === 'sensitive') {
    return `Sensitive tap at (${action.x}, ${action.y})`
  }

  return null
}

export async function assertSensitiveActionConfirmed(
  action: AgentAction,
  options?: ExecuteActionOptions,
) {
  const message = getSensitiveActionMessage(action)
  if (!message) {
    return
  }

  const confirmed = options?.confirmSensitiveAction
    ? await options.confirmSensitiveAction(message, action)
    : false

  if (!confirmed) {
    throw new DeviceBackendError(`Sensitive action blocked: ${message}`)
  }
}
