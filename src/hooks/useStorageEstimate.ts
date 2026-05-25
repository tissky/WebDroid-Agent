import { useEffect, useState } from 'react'

export type StorageEstimateStatus = 'idle' | 'loading' | 'done' | 'unsupported' | 'error'

export type StorageUsageEstimate = {
  quotaBytes?: number
  usageBytes: number
}

export function useStorageEstimate(enabled: boolean) {
  const [storageEstimate, setStorageEstimate] = useState<StorageUsageEstimate | null>(null)
  const [storageEstimateStatus, setStorageEstimateStatus] =
    useState<StorageEstimateStatus>('idle')

  useEffect(() => {
    if (!enabled) {
      return
    }

    let active = true

    async function loadStorageEstimate() {
      const storage = globalThis.navigator?.storage
      const estimate = storage?.estimate
      if (typeof estimate !== 'function') {
        setStorageEstimate(null)
        setStorageEstimateStatus('unsupported')
        return
      }

      setStorageEstimateStatus('loading')
      try {
        const result = await estimate.call(storage)
        if (!active) {
          return
        }

        setStorageEstimate({
          quotaBytes: normalizeByteCount(result.quota),
          usageBytes: normalizeByteCount(result.usage) ?? 0,
        })
        setStorageEstimateStatus('done')
      } catch {
        if (active) {
          setStorageEstimate(null)
          setStorageEstimateStatus('error')
        }
      }
    }

    void loadStorageEstimate()
    return () => {
      active = false
    }
  }, [enabled])

  return { storageEstimate, storageEstimateStatus }
}

function normalizeByteCount(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }
  return Math.max(0, value)
}
