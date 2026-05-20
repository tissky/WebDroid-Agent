import { describe, expect, it, vi } from 'vitest'
import type { DeviceBackend } from '../adapters/deviceBackend'
import { createAgentRunner, runAgentStep } from './agent'
import type { OpenAiClient } from './openAiClient'

function fakeDevice(): DeviceBackend & { executed: string[] } {
  const executed: string[] = []
  return {
    executed,
    connect: vi.fn(),
    disconnect: vi.fn(),
    screenshot: vi.fn(async () => ({
      bytes: new Uint8Array(),
      dataUrl: 'data:image/png;base64,abc',
      screen: { width: 1080, height: 2400 },
    })),
    execute: vi.fn(async (action) => {
      executed.push(action.action)
      return action.action
    }),
  }
}

describe('runAgentStep', () => {
  it('captures the screen, asks the model, and validates the action', async () => {
    const device = fakeDevice()
    const client: OpenAiClient = {
      completeAction: vi.fn(async () => '{"action":"tap","x":100,"y":200,"reason":"open"}'),
    }

    const step = await runAgentStep({
      device,
      client,
      modelConfig: { baseUrl: 'https://api.example.com/v1', apiKey: 'key', model: 'm' },
      task: 'Open app',
    })

    expect(step.action).toEqual({ action: 'tap', x: 100, y: 200, reason: 'open' })
    expect(step.preview).toBe('tap (100, 200) - open')
    expect(client.completeAction).toHaveBeenCalledWith(
      expect.objectContaining({
        screenshotDataUrl: 'data:image/png;base64,abc',
        screen: { width: 1080, height: 2400 },
      }),
    )
  })
})

describe('createAgentRunner', () => {
  it('stops after preparing a manual-review action', async () => {
    const device = fakeDevice()
    const client: OpenAiClient = {
      completeAction: vi.fn(async () => '{"action":"tap","x":100,"y":200}'),
    }
    const runner = createAgentRunner({ device, client })

    const result = await runner.run({
      modelConfig: { baseUrl: 'https://api.example.com/v1', apiKey: 'key', model: 'm' },
      task: 'Open app',
      autoExecute: false,
      maxSteps: 5,
    })

    expect(result.status).toBe('awaiting_review')
    expect(device.executed).toEqual([])
  })

  it('stops when the model returns done', async () => {
    const device = fakeDevice()
    const client: OpenAiClient = {
      completeAction: vi.fn(async () => '{"action":"done","summary":"finished"}'),
    }
    const runner = createAgentRunner({ device, client })

    const result = await runner.run({
      modelConfig: { baseUrl: 'https://api.example.com/v1', apiKey: 'key', model: 'm' },
      task: 'Open app',
      autoExecute: true,
      maxSteps: 5,
    })

    expect(result.status).toBe('done')
    expect(device.executed).toEqual([])
  })

  it('stops for manual takeover even when auto-execute is enabled', async () => {
    const device = fakeDevice()
    const client: OpenAiClient = {
      completeAction: vi.fn(async () => '{"action":"Take_over","message":"login required"}'),
    }
    const runner = createAgentRunner({ device, client })

    const result = await runner.run({
      modelConfig: { baseUrl: 'https://api.example.com/v1', apiKey: 'key', model: 'm' },
      task: 'Open app',
      autoExecute: true,
      maxSteps: 5,
    })

    expect(result.status).toBe('awaiting_takeover')
    expect(device.executed).toEqual([])
  })

  it('stops at the max step limit', async () => {
    const device = fakeDevice()
    const client: OpenAiClient = {
      completeAction: vi.fn(async () => '{"action":"wait","ms":100}'),
    }
    const runner = createAgentRunner({ device, client })

    const result = await runner.run({
      modelConfig: { baseUrl: 'https://api.example.com/v1', apiKey: 'key', model: 'm' },
      task: 'Open app',
      autoExecute: true,
      maxSteps: 2,
    })

    expect(result.status).toBe('max_steps')
    expect(device.executed).toEqual(['wait', 'wait'])
  })
})
