// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { APP_COPY } from '../lib/appCopy'
import { DevicePanel } from './DevicePanel'

function renderDevicePanel(overrides: Partial<Parameters<typeof DevicePanel>[0]> = {}) {
  const props: Parameters<typeof DevicePanel>[0] = {
    actions: {
      onActionSettleMsChange: vi.fn(),
      onCaptureScreen: vi.fn(),
      onConfirmSensitiveActionsChange: vi.fn(),
      onConfigureAdbKeyboard: vi.fn(),
      onConnectDevice: vi.fn(),
      onDisconnectDevice: vi.fn(),
      onDoubleTapIntervalMsChange: vi.fn(),
      onKeyboardStepMsChange: vi.fn(),
      onLaunchInstalledApp: vi.fn(),
      onPreferAdbKeyboardChange: vi.fn(),
      onRunDirectAction: vi.fn(),
      onRunDoctor: vi.fn(),
      onUnrestrictedModeChange: vi.fn(),
    },
    copy: APP_COPY['zh-CN'],
    options: {
      actionSettleMs: 1000,
      confirmSensitiveActions: false,
      doubleTapIntervalMs: 100,
      keyboardStepMs: 1000,
      preferAdbKeyboard: false,
      unrestrictedMode: false,
    },
    state: {
      busyTask: null,
      connected: false,
      currentApp: 'Unknown',
      deviceInfo: null,
      doctorResults: [],
      deviceState: { app: 'Unknown' },
      installedApps: [],
    },
    ...overrides,
  }

  return render(<DevicePanel {...props} />)
}

describe('DevicePanel', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows an ADB connection recovery hint next to the connect controls', () => {
    renderDevicePanel()

    const help = screen.getByRole('button', { name: 'ADB 连接帮助' })

    expect(help.closest('.adb-help')).toBeTruthy()
    expect(
      within(help.closest('.adb-help') as HTMLElement).getByText(
        '如果连接不上，请在终端输入 adb kill-server，然后重新连接设备。',
      ),
    ).toBeTruthy()
  })
})
