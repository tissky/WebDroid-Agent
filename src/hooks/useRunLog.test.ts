// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MAX_RUN_LOG_ENTRIES, MAX_RUN_LOG_SCREENSHOTS, useRunLog } from './useRunLog'

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

  it('caps log entries and drops screenshots from older entries', () => {
    const { result } = renderHook(() => useRunLog())

    act(() => {
      for (let index = 1; index <= MAX_RUN_LOG_ENTRIES + 5; index += 1) {
        result.current.addLog({
          tone: 'info',
          title: `Event ${index}`,
          screenshot: {
            dataUrl: `data:image/png;base64,${index}`,
            screen: { width: 100, height: 200 },
          },
        })
      }
    })

    expect(result.current.logs).toHaveLength(MAX_RUN_LOG_ENTRIES)
    expect(result.current.logs.filter((entry) => entry.screenshot)).toHaveLength(
      MAX_RUN_LOG_SCREENSHOTS,
    )
    expect(result.current.logs[0].title).toBe(`Event ${MAX_RUN_LOG_ENTRIES + 5}`)
    expect(result.current.logs[MAX_RUN_LOG_SCREENSHOTS].screenshot).toBeUndefined()
  })
})
