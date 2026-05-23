// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRunLog } from './useRunLog'

describe('useRunLog', () => {
  it('adds new log entries at the top and clears them', () => {
    const { result } = renderHook(() => useRunLog())

    act(() => {
      result.current.addLog({ tone: 'info', title: 'First event' })
      result.current.addLog({ tone: 'ok', title: 'Second event' })
    })

    expect(result.current.logs.map((entry) => entry.title)).toEqual([
      'Second event',
      'First event',
    ])
    expect(result.current.logs[0].id).toEqual(expect.any(Number))
    expect(result.current.logs[0].time).toEqual(expect.any(String))

    act(() => {
      result.current.clearLogs()
    })

    expect(result.current.logs).toEqual([])
  })
})
