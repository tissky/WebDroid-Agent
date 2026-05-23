// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { APP_COPY } from '../lib/appCopy'
import { RunPanel } from './RunPanel'

function renderRunPanel(overrides: Partial<Parameters<typeof RunPanel>[0]> = {}) {
  const props: Parameters<typeof RunPanel>[0] = {
    autoExecute: false,
    busyTask: null,
    canRun: false,
    chatInput: '',
    conversation: [],
    copy: APP_COPY['en-US'],
    logsCount: 0,
    maxSteps: 8,
    onAutoExecuteChange: vi.fn(),
    onChatInputChange: vi.fn(),
    onExecutePendingStep: vi.fn(),
    onExportRunLog: vi.fn(),
    onMaxStepsChange: vi.fn(),
    onPlanNextStep: vi.fn(),
    onResetSession: vi.fn(),
    onRunAutoLoop: vi.fn(),
    onStartNewChat: vi.fn(),
    onStopRun: vi.fn(),
    onSubmitChatMessage: vi.fn(),
    onTaskTemplateSelect: vi.fn(),
    pendingStep: null,
    taskTemplates: [],
    ...overrides,
  }

  return render(<RunPanel {...props} />)
}

describe('RunPanel', () => {
  afterEach(() => {
    cleanup()
  })

  it('keeps chat, conversation management, and agent run actions in separate regions', () => {
    renderRunPanel()

    const title = screen.getByRole('heading', { name: 'Chat' }).closest('.panel-title')
    expect(title).toBeTruthy()
    expect(within(title as HTMLElement).getByRole('button', { name: /new chat/i })).toBeTruthy()

    const sendButton = screen.getByRole('button', { name: /^send$/i })
    expect(sendButton.closest('.composer-actions')).toBeTruthy()
    expect(sendButton.closest('.agent-run-actions')).toBeNull()

    const runButton = screen.getByRole('button', { name: /plan next step/i })
    expect(runButton.closest('.agent-run-actions')).toBeTruthy()
    expect(runButton.className).toContain('primary')
    expect(screen.queryByRole('button', { name: /^run$/i })).toBeNull()
  })

  it('shows exactly one primary agent action for the selected run mode', () => {
    renderRunPanel({ autoExecute: false, canRun: true })

    const manualPrimaryButtons = document.querySelectorAll('.agent-run-actions button.primary')
    expect(manualPrimaryButtons).toHaveLength(1)
    expect(screen.getByRole('button', { name: /plan next step/i })).toBeTruthy()

    cleanup()
    renderRunPanel({ autoExecute: true, canRun: true })

    const autoPrimaryButtons = document.querySelectorAll('.agent-run-actions button.primary')
    expect(autoPrimaryButtons).toHaveLength(1)
    expect(screen.getByRole('button', { name: /run agent/i })).toBeTruthy()
  })

  it('shows the running state from a stable busy id instead of the display label', () => {
    renderRunPanel({
      autoExecute: true,
      busyTask: { id: 'run-agent' },
      canRun: false,
    })

    expect(screen.getByRole('button', { name: /running/i })).toBeTruthy()
  })

  it('explains disabled chat and run actions without showing an inert execute button', () => {
    renderRunPanel()

    expect(screen.getByRole('button', { name: /^send$/i }).getAttribute('title')).toBe(
      'Type a message first.',
    )
    expect(screen.getByRole('button', { name: /plan next step/i }).getAttribute('title')).toBe(
      'Connect a device, configure the model, and send or choose a task first.',
    )
    expect(screen.queryByRole('button', { name: /^execute$/i })).toBeNull()
  })
})
