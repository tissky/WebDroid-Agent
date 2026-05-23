import { describe, expect, it } from 'vitest'
import type { AgentStep } from './agent'
import {
  buildAgentStepTimeline,
  createRunLogEntry,
  formatAgentStepDetail,
  formatScreenCaptureDetail,
  toLogScreenshot,
} from './runLogEntries'

const screenshot = {
  bytes: new Uint8Array(),
  dataUrl: 'data:image/png;base64,native',
  modelDataUrl: 'data:image/png;base64,model',
  modelScreen: { width: 540, height: 1200 },
  screen: { width: 1080, height: 2400 },
}

const step: AgentStep = {
  action: { action: 'tap', x: 10, y: 20 },
  currentApp: 'Chrome',
  deviceState: {
    app: 'Chrome',
    packageName: 'com.android.chrome',
  },
  executionAction: { action: 'tap', x: 20, y: 40 },
  index: 3,
  modelOutput: '{"action":"tap","x":10,"y":20}',
  preview: 'Tap (10, 20)',
  screenshot,
  timing: {
    captureMs: 1,
    currentAppMs: 2,
    modelMs: 3,
    parseMs: 4,
    totalMs: 10,
  },
}

describe('run log entries', () => {
  it('adds stable display metadata to run log entries', () => {
    const entry = createRunLogEntry(
      {
        detail: 'Connected',
        title: 'Device connected',
        tone: 'ok',
      },
      new Date('2026-05-23T04:05:06Z'),
      42,
    )

    expect(entry).toEqual({
      detail: 'Connected',
      id: 42,
      time: expect.stringMatching(/04:05:06|12:05:06/),
      title: 'Device connected',
      tone: 'ok',
    })
  })

  it('formats screen captures with size and device state', () => {
    expect(
      formatScreenCaptureDetail(screenshot, {
        app: 'Chrome',
        keyboard: 'com.android.adbkeyboard/.AdbIME',
        packageName: 'com.android.chrome',
      }),
    ).toBe(
      [
        '1080x2400',
        'Current app: Chrome',
        'Package: com.android.chrome',
        'Keyboard: com.android.adbkeyboard/.AdbIME',
      ].join('\n'),
    )
  })

  it('formats agent step details and timelines consistently', () => {
    expect(formatAgentStepDetail(step)).toBe(
      [
        'Current app: Chrome',
        'Timing: capture 1ms, app 2ms, model 3ms, parse 4ms, total 10ms',
        '{"action":"tap","x":10,"y":20}',
      ].join('\n\n'),
    )

    expect(buildAgentStepTimeline(step, 'ok')).toEqual({
      actionPreview: 'tap (10, 20)',
      currentApp: 'Chrome',
      executionActionPreview: 'tap (20, 40)',
      executionResult: 'ok',
      modelOutput: '{"action":"tap","x":10,"y":20}',
      packageName: 'com.android.chrome',
      step: 3,
    })
  })

  it('keeps log screenshots in model-view coordinates', () => {
    expect(toLogScreenshot(screenshot)).toEqual({
      dataUrl: 'data:image/png;base64,model',
      screen: { width: 540, height: 1200 },
    })
    expect(toLogScreenshot(null)).toBeUndefined()
  })
})
