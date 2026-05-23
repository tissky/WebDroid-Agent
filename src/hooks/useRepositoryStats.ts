import { useEffect, useRef, useState } from 'react'
import { REPOSITORY_API_URL, readRepositoryStats, type RepositoryStats } from '../lib/repository'

export type RepositoryStatsStatus = 'idle' | 'loading' | 'done' | 'error'

export function useRepositoryStats(enabled: boolean) {
  const settledRef = useRef(false)
  const [repositoryStats, setRepositoryStats] = useState<RepositoryStats | null>(null)
  const [repositoryStatsStatus, setRepositoryStatsStatus] =
    useState<RepositoryStatsStatus>('idle')

  useEffect(() => {
    if (!enabled || settledRef.current) {
      return
    }

    let active = true

    async function loadRepositoryStats() {
      if (typeof fetch !== 'function') {
        if (active) {
          setRepositoryStatsStatus('error')
          settledRef.current = true
        }
        return
      }

      setRepositoryStatsStatus('loading')
      try {
        const response = await fetch(REPOSITORY_API_URL)
        if (!response.ok) {
          throw new Error(`GitHub responded with ${response.status}`)
        }
        const payload = await response.json()
        if (!active) {
          return
        }
        setRepositoryStats(readRepositoryStats(payload))
        setRepositoryStatsStatus('done')
        settledRef.current = true
      } catch {
        if (active) {
          setRepositoryStatsStatus('error')
          settledRef.current = true
        }
      }
    }

    void loadRepositoryStats()
    return () => {
      active = false
    }
  }, [enabled])

  return { repositoryStats, repositoryStatsStatus }
}
