// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DeviceScreenshot } from '../adapters/deviceTypes'
import type { AgentStep } from '../lib/agent'
import type { AgentAction } from '../lib/actionTypes'
import { APP_COPY } from '../lib/appCopy'
import {
  createAgentThread,
  recordThreadTurnExecution,
  startThreadTurn,
} from '../lib/agentThread'
import { buildInteractionStream } from '../lib/interactionStream'
import { ConversationPanel } from './ConversationPanel'

const screenshot: DeviceScreenshot = {
  bytes: new Uint8Array([1, 2, 3]),
  dataUrl: 'data:image/png;base64,abc',
  screen: { width: 1080, height: 2400 },
}

function renderConversationPanel(
  overrides: Partial<Parameters<typeof ConversationPanel>[0]> = {},
) {
  const props: Parameters<typeof ConversationPanel>[0] = {
    activeThreadId: 'thread-current',
    busyTask: null,
    chatInput: '',
    conversation: [],
    copy: APP_COPY['en-US'],
    historySidebarOpen: false,
    onChatInputChange: vi.fn(),
    onCloseHistorySidebar: vi.fn(),
    onDeleteThread: vi.fn(),
    onExecutePendingStep: vi.fn(),
    onSelectThread: vi.fn(),
    onStartNewChat: vi.fn(),
    onStopRun: vi.fn(),
    onSubmitChatMessage: vi.fn(),
    onToggleHistorySidebar: vi.fn(),
    pendingStep: null,
    threadSummaries: [],
    ...overrides,
  }

  return render(<ConversationPanel {...props} />)
}

describe('ConversationPanel', () => {
  afterEach(() => {
    cleanup()
  })

  it('keeps the chat composer in the chat region without advanced debug controls', () => {
    renderConversationPanel()

    const title = screen.getByRole('heading', { name: 'Chat' }).closest('.panel-title')
    expect(title).toBeTruthy()
    expect(within(title as HTMLElement).getByRole('button', { name: /new chat/i })).toBeTruthy()
    expect(within(title as HTMLElement).getByRole('button', { name: /open history sidebar/i })).toBeTruthy()

    const sendButton = screen.getByRole('button', { name: /^send$/i })
    expect(sendButton.closest('.chat-composer')).toBeTruthy()
    expect(sendButton.closest('.chat-input-actions')).toBeTruthy()
    expect(document.querySelector('.chat-empty')).toBeNull()
    expect(screen.queryByText('Advanced/debug')).toBeNull()
    expect(screen.queryByRole('button', { name: /plan next step/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /run agent/i })).toBeNull()
  })

  it('opens the AMC-style chat history sidebar and routes history actions', () => {
    const onCloseHistorySidebar = vi.fn()
    const onDeleteThread = vi.fn()
    const onSelectThread = vi.fn()
    const onStartNewChat = vi.fn()
    renderConversationPanel({
      activeThreadId: 'thread-2',
      historySidebarOpen: true,
      onCloseHistorySidebar,
      onDeleteThread,
      onSelectThread,
      onStartNewChat,
      threadSummaries: [
        {
          id: 'thread-2',
          title: 'Second task',
          task: 'Second task',
          status: 'idle',
          createdAt: 2000,
          updatedAt: 2000,
        },
        {
          id: 'thread-1',
          title: 'First task',
          task: 'First task',
          status: 'idle',
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
    })

    const sidebar = screen.getByRole('complementary', { name: /history/i })
    expect(sidebar).toBeTruthy()
    expect(screen.getByRole('heading', { name: /recent chats/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /open chat second task/i }).getAttribute('aria-current')).toBe('page')

    fireEvent.change(screen.getByRole('textbox', { name: /search chat history/i }), {
      target: { value: 'first' },
    })
    fireEvent.click(screen.getByRole('button', { name: /open chat first task/i }))
    expect(onSelectThread).toHaveBeenCalledWith('thread-1')

    fireEvent.click(screen.getByRole('button', { name: /delete chat first task/i }))
    expect(onDeleteThread).toHaveBeenCalledWith('thread-1')

    fireEvent.click(within(sidebar).getByRole('button', { name: /^new chat$/i }))
    expect(onStartNewChat).toHaveBeenCalledTimes(1)
    expect(onCloseHistorySidebar).toHaveBeenCalledTimes(1)
  })

  it('returns focus to the chat input after starting a new chat', () => {
    const onStartNewChat = vi.fn()
    renderConversationPanel({ onStartNewChat })

    const newChatButton = screen.getByRole('button', { name: /new chat/i })
    const input = screen.getByRole('textbox', { name: /chat message/i })

    newChatButton.focus()
    expect(document.activeElement).toBe(newChatButton)

    fireEvent.click(newChatButton)

    expect(onStartNewChat).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(input)
  })

  it('renders the conversation as a persistent chat stream with a bottom composer', () => {
    renderConversationPanel({
      conversation: [
        { id: 'u1', role: 'user', content: 'Open Settings.' },
        { id: 'o1', role: 'observation', content: 'Current app: Settings.' },
        { id: 'a1', role: 'assistant', content: 'Done.' },
      ],
    })

    expect(screen.queryByRole('button', { name: 'Conversation' })).toBeNull()

    const chatShell = document.querySelector('.chat-shell')
    const chatStream = document.querySelector('.chat-stream')
    const composer = document.querySelector('.chat-composer')

    expect(chatShell).toBeTruthy()
    expect(chatStream).toBeTruthy()
    expect(composer).toBeTruthy()
    expect(chatShell?.contains(chatStream)).toBe(true)
    expect(chatShell?.contains(composer)).toBe(true)
    expect(within(chatStream as HTMLElement).getByText('Open Settings.')).toBeTruthy()
    expect(within(chatStream as HTMLElement).getByText('Current app: Settings.')).toBeTruthy()
    expect(within(chatStream as HTMLElement).getByText('Done.')).toBeTruthy()
    expect(composer?.compareDocumentPosition(chatStream as HTMLElement)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    )
  })

  it('renders chat messages as sanitized markdown', () => {
    renderConversationPanel({
      conversation: [
        {
          id: 'a1',
          role: 'assistant',
          content: '## Result\n\n- **Done**\n\n[Docs](https://example.com)\n\n<script>alert(1)</script>',
        },
      ],
    })

    const chatStream = screen.getByLabelText('Conversation')
    const heading = within(chatStream).getByRole('heading', { name: 'Result' })
    const strong = within(chatStream).getByText('Done')
    const link = within(chatStream).getByRole('link', { name: 'Docs' })

    expect(heading.tagName).toBe('H2')
    expect(strong.tagName).toBe('STRONG')
    expect(link.getAttribute('href')).toBe('https://example.com')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(chatStream.querySelector('script')).toBeNull()
  })

  it('renders agent steps with their execution result in the chat stream', () => {
    const thread = createAgentThread('Open Wi-Fi settings', { now: 1000 })
    const action: AgentAction = { action: 'tap', x: 120, y: 240, reason: 'open Wi-Fi' }
    const turn = startThreadTurn(thread, {
      id: 'turn-1',
      index: 1,
      task: 'Open Wi-Fi settings',
      latestUserMessage: 'Open Wi-Fi settings',
      promptContext: 'Task: Open Wi-Fi settings',
      modelOutput: '{"action":"tap","x":120,"y":240}',
      action,
      executionAction: action,
      preview: 'tap (120, 240) - open Wi-Fi',
      deviceSnapshot: {
        currentApp: 'Settings',
        deviceState: { app: 'Settings', packageName: 'com.android.settings' },
        screenshot,
      },
      timing: { captureMs: 1, currentAppMs: 2, modelMs: 3, parseMs: 4, totalMs: 10 },
      now: 1100,
    })
    recordThreadTurnExecution(thread, turn.id, {
      executionResult: 'input tap 120 240',
      success: true,
      now: 1200,
    })

    renderConversationPanel({
      conversation: thread.messages,
      interactionItems: buildInteractionStream(thread),
    })

    const chatStream = screen.getByLabelText('Conversation')
    const step = within(chatStream).getByLabelText('Step 1: Tap')

    expect(within(step).getByText('Tap')).toBeTruthy()
    expect(within(step).getByText('#1')).toBeTruthy()
    expect(step.querySelector('.agent-step-action-icon svg')).toBeTruthy()
    expect(within(step).getByText('Executed')).toBeTruthy()
    expect(within(step).queryByText('input tap 120 240')).toBeNull()
    fireEvent.click(within(step).getByText('Details'))
    expect(within(step).getByText('tap (120, 240) - open Wi-Fi')).toBeTruthy()
    expect(within(step).getByText('input tap 120 240')).toBeTruthy()
    expect(within(chatStream).queryAllByText('input tap 120 240')).toHaveLength(1)
  })

  it('submits chat with Enter while keeping Shift Enter for multiline input', () => {
    const onSubmitChatMessage = vi.fn()
    renderConversationPanel({
      chatInput: 'Open Wi-Fi settings',
      onSubmitChatMessage,
    })

    const input = screen.getByRole('textbox', { name: /chat message/i })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmitChatMessage).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(onSubmitChatMessage).toHaveBeenCalledTimes(1)
  })

  it('shows a stop button in the send position while the agent run is active', () => {
    const onStopRun = vi.fn()
    const onSubmitChatMessage = vi.fn()
    renderConversationPanel({
      busyTask: { id: 'run-agent' },
      chatInput: 'Queue this after stop',
      onStopRun,
      onSubmitChatMessage,
    })

    expect(screen.queryByRole('button', { name: /^send$/i })).toBeNull()

    const stopButton = screen.getByRole('button', { name: /^stop run$/i })
    expect(stopButton.closest('.chat-composer')).toBeTruthy()
    fireEvent.click(stopButton)

    expect(onStopRun).toHaveBeenCalledTimes(1)
    expect(onSubmitChatMessage).not.toHaveBeenCalled()
  })

  it('explains disabled chat without showing advanced run actions or an inert execute button', () => {
    renderConversationPanel()

    expect(screen.getByRole('button', { name: /^send$/i }).getAttribute('title')).toBe(
      'Type a message first.',
    )
    expect(screen.queryByText('Advanced/debug')).toBeNull()
    expect(screen.queryByRole('button', { name: /plan next step/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /run agent/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^execute$/i })).toBeNull()
  })

  it('does not keep max steps in the conversation panel after moving it to settings', () => {
    renderConversationPanel()

    expect(screen.queryByLabelText(/max steps/i)).toBeNull()
  })

  it('does not render task template controls', () => {
    renderConversationPanel()

    expect(screen.queryByText('Task template')).toBeNull()
    expect(screen.queryByLabelText(/task template/i)).toBeNull()
  })

  it('hides the pending action panel when there is no pending step', () => {
    renderConversationPanel({ pendingStep: null })

    expect(document.querySelector('.pending-action')).toBeNull()
    expect(screen.queryByText('Pending action')).toBeNull()
    expect(screen.queryByText('None')).toBeNull()
  })

  it('keeps the pending action panel for a real pending step', () => {
    const pendingStep = {
      index: 2,
      action: {
        action: 'tap',
        x: 120,
        y: 240,
      },
      preview: 'tap at 120, 240',
    } as AgentStep

    renderConversationPanel({ pendingStep })

    const pendingAction = document.querySelector('.pending-action')
    expect(pendingAction).toBeTruthy()
    expect(within(pendingAction as HTMLElement).getByText('Pending action')).toBeTruthy()
    expect(within(pendingAction as HTMLElement).getByText('Step 2')).toBeTruthy()
    expect(within(pendingAction as HTMLElement).getByText('tap (120, 240)')).toBeTruthy()
    expect(
      within(pendingAction as HTMLElement).getByRole('button', { name: /^execute$/i }),
    ).toBeTruthy()
  })
})
