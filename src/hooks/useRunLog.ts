import { useCallback, useState } from 'react'
import {
  createRunLogEntry,
  type LogEntry,
  type LogEntryInput,
} from '../lib/runLogEntries'

export function useRunLog() {
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = useCallback((entry: LogEntryInput) => {
    setLogs((current) => [createRunLogEntry(entry), ...current])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return {
    logs,
    addLog,
    clearLogs,
  }
}
