import { DeviceBackendError, type DeviceRetryOptions } from './deviceTypes'

export const DEFAULT_DEVICE_READ_RETRY_DELAYS_MS = [250, 750, 1500] as const
export const DEFAULT_DEVICE_READ_MAX_ATTEMPTS = 4

export async function retryDeviceOperation<T>(
  operation: () => Promise<T>,
  {
    label,
    maxAttempts = DEFAULT_DEVICE_READ_MAX_ATTEMPTS,
    retryDelaysMs = DEFAULT_DEVICE_READ_RETRY_DELAYS_MS,
    recoverAfterAttempt,
    recover,
    wait = delay,
    shouldRetry,
  }: DeviceRetryOptions,
): Promise<T> {
  let lastError: unknown
  let recoveryAttempted = false

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation()
    } catch (caught) {
      lastError = caught
      const isLastAttempt = attempt >= maxAttempts
      if (isLastAttempt || shouldRetry?.(caught, attempt) === false) {
        break
      }

      if (
        recover &&
        recoverAfterAttempt !== undefined &&
        attempt >= recoverAfterAttempt &&
        !recoveryAttempted
      ) {
        recoveryAttempted = true
        try {
          await recover(caught, attempt)
        } catch {
          // Recovery is best-effort; preserve the original read error.
        }
      }

      const delayMs = retryDelaysMs[Math.min(attempt - 1, retryDelaysMs.length - 1)] ?? 0
      if (delayMs > 0) {
        await wait(delayMs)
      }
    }
  }

  throw new DeviceBackendError(
    `Failed to get ${label} after ${maxAttempts} attempts: ${describeError(lastError)}`,
  )
}

export function delay(ms: number) {
  return new Promise<void>((resolve) => globalThis.setTimeout(resolve, ms))
}

function describeError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim()
  }
  return String(error || 'unknown error')
}
