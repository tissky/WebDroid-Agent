import { describe, expect, it, vi } from 'vitest'
import type { DeviceBackend } from '../adapters/deviceTypes'
import { runDeviceDoctor } from './deviceDoctor'

function byId(results: Awaited<ReturnType<typeof runDeviceDoctor>>) {
  return Object.fromEntries(results.map((result) => [result.id, result]))
}

describe('runDeviceDoctor', () => {
  it('reports missing browser, device, and model prerequisites with skipped dependent checks', async () => {
    const results = byId(
      await runDeviceDoctor({
        connected: false,
        device: null,
        deviceInfo: null,
        isWebUsbSupported: () => false,
        modelConfig: { baseUrl: '', apiKey: '', model: '' },
        fetcher: vi.fn(),
      }),
    )

    expect(results.webusb.status).toBe('error')
    expect(results.device.status).toBe('error')
    expect(results.screenshot.status).toBe('skipped')
    expect(results.current_app.status).toBe('skipped')
    expect(results.keyboard.status).toBe('skipped')
    expect(results.adb_keyboard.status).toBe('skipped')
    expect(results.model_config.status).toBe('error')
    expect(results.model_api.status).toBe('skipped')
    expect(results.device.fix).toContain('Connect')
  })

  it('checks a connected device, input methods, screen size, and model API reachability', async () => {
    const device = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      screenshot: vi.fn(async () => ({
        bytes: new Uint8Array(),
        dataUrl: 'data:image/png;base64,abc',
        screen: { width: 1080, height: 2400 },
      })),
      getCurrentApp: vi.fn(),
      getDeviceState: vi.fn(async () => ({
        app: 'Chrome',
        packageName: 'com.android.chrome',
        keyboard: 'com.android.adbkeyboard/.AdbIME',
      })),
      getInputMethods: vi.fn(async () => 'com.android.adbkeyboard/.AdbIME'),
      execute: vi.fn(),
    } satisfies DeviceBackend
    const fetcher = vi.fn(async () => ({ ok: true, status: 200 })) as unknown as typeof fetch

    const results = byId(
      await runDeviceDoctor({
        connected: true,
        device,
        deviceInfo: { serial: 'device-1', name: 'Pixel' },
        isWebUsbSupported: () => true,
        modelConfig: {
          baseUrl: 'https://api.example.com/v1/',
          apiKey: 'secret',
          model: 'vision-model',
        },
        fetcher,
      }),
    )

    expect(results.webusb.status).toBe('ok')
    expect(results.device.detail).toContain('Pixel')
    expect(results.screenshot.status).toBe('ok')
    expect(results.screen_size.detail).toContain('1080x2400')
    expect(results.current_app.detail).toContain('Chrome')
    expect(results.keyboard.status).toBe('ok')
    expect(results.adb_keyboard.status).toBe('ok')
    expect(results.model_api.status).toBe('ok')
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.com/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      }),
    )
  })
})
