import { MessageSquare, PanelLeftClose, PanelLeftOpen, Send, Square, SquarePen } from 'lucide-react'
import { useRef, type KeyboardEvent, type MouseEvent } from 'react'
import type { AppCopy } from '../lib/appCopy'
import type { BusyTask } from '../lib/busyTask'
import type { InteractionStreamItem } from '../lib/interactionStream'
import type { AgentConversationMessage } from '../lib/openAiTypes'
import type { AgentThreadSummary } from '../lib/threadStore'
import { AgentStepCard } from './AgentStepCard'
import { ChatHistorySidebar } from './ChatHistorySidebar'
import { MarkdownContent } from './MarkdownContent'

type ChatPanelProps = {
  activeThreadId: string
  busyTask: BusyTask | null
  chatInput: string
  conversation: AgentConversationMessage[]
  interactionItems?: InteractionStreamItem[]
  copy: AppCopy
  historySidebarOpen: boolean
  threadSummaries: AgentThreadSummary[]
  onChatInputChange: (value: string) => void
  onCloseHistorySidebar: () => void
  onDeleteThread: (threadId: string) => void
  onSelectThread: (threadId: string) => void
  onStartNewChat: () => void
  onStopRun: () => void
  onSubmitChatMessage: () => void
  onToggleHistorySidebar: () => void
}

export function ChatPanel({
  activeThreadId,
  busyTask,
  chatInput,
  conversation,
  interactionItems,
  copy,
  historySidebarOpen,
  threadSummaries,
  onChatInputChange,
  onCloseHistorySidebar,
  onDeleteThread,
  onSelectThread,
  onStartNewChat,
  onStopRun,
  onSubmitChatMessage,
  onToggleHistorySidebar,
}: ChatPanelProps) {
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null)
  const chatIsEmpty = chatInput.trim().length === 0
  const isBusy = Boolean(busyTask)
  const canStopRun = busyTask?.id === 'run-agent'
  const items =
    interactionItems ?? conversation.map<InteractionStreamItem>((message) => messageToItem(message))
  const activeStepId = isAgentStepBusyTask(busyTask) ? findLatestOpenStepId(items) : null
  const submitChatIfNotEmpty = () => {
    if (!chatIsEmpty) {
      onSubmitChatMessage()
    }
  }
  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()
    submitChatIfNotEmpty()
  }
  const handleStartNewChat = () => {
    onStartNewChat()
    chatInputRef.current?.focus()
  }
  const handleHistoryNewChat = () => {
    handleStartNewChat()
    onCloseHistorySidebar()
  }
  const focusComposerShell = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target
    if (target instanceof Element && target.closest('button, textarea, input, label')) {
      return
    }

    chatInputRef.current?.focus()
  }

  return (
    <section className="chat-shell" aria-label={copy.chat}>
      {historySidebarOpen ? (
        <button
          type="button"
          className="chat-history-backdrop"
          aria-label={copy.closeHistorySidebar}
          onClick={onCloseHistorySidebar}
        />
      ) : null}
      <ChatHistorySidebar
        activeThreadId={activeThreadId}
        busyTask={busyTask}
        copy={copy}
        isOpen={historySidebarOpen}
        onClose={onCloseHistorySidebar}
        onDeleteThread={onDeleteThread}
        onNewChat={handleHistoryNewChat}
        onSelectThread={onSelectThread}
        threadSummaries={threadSummaries}
      />
      <div className="panel-title conversation-panel-title chat-shell-header">
        <div className="panel-title-main">
          <button
            type="button"
            className="icon-button chat-history-toggle"
            aria-expanded={historySidebarOpen}
            aria-label={historySidebarOpen ? copy.closeHistorySidebar : copy.openHistorySidebar}
            title={historySidebarOpen ? copy.closeHistorySidebar : copy.openHistorySidebar}
            onClick={onToggleHistorySidebar}
          >
            {historySidebarOpen ? (
              <PanelLeftClose size={20} strokeWidth={2} />
            ) : (
              <PanelLeftOpen size={20} strokeWidth={2} />
            )}
          </button>
          <MessageSquare size={18} />
          <h2>{copy.chat}</h2>
        </div>
        <button
          type="button"
          className="panel-title-action"
          onClick={handleStartNewChat}
          disabled={isBusy}
          title={busyTask ? copy.waitForCurrentRun : copy.newChat}
        >
          <SquarePen size={16} strokeWidth={2} />
          {copy.newChat}
        </button>
      </div>
      <div className="chat-stream" aria-label={copy.conversation}>
        {items.map((item) =>
          item.type === 'step' ? (
            <AgentStepCard
              copy={copy}
              isActive={item.turn.id === activeStepId}
              key={item.id}
              turn={item.turn}
            />
          ) : (
            <article className={`chat-message ${item.message.role}`} key={item.id}>
              <span className="visually-hidden">
                {formatConversationRole(item.message.role, copy)}
              </span>
              <MarkdownContent className="chat-message-content" content={item.message.content} />
            </article>
          ),
        )}
      </div>
      <form
        className="chat-composer"
        onSubmit={(event) => {
          event.preventDefault()
          submitChatIfNotEmpty()
        }}
      >
        <div className="chat-input-frame" onClick={focusComposerShell}>
          <label className="chat-input-label">
            <span className="visually-hidden">{copy.chatMessage}</span>
            <textarea
              ref={chatInputRef}
              className="chat-input"
              value={chatInput}
              onChange={(event) => onChatInputChange(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={1}
              placeholder={copy.chatPlaceholder}
            />
          </label>
          <div className="chat-input-actions">
            <span className="chat-input-action-spacer" aria-hidden="true" />
            {canStopRun ? (
              <button
                type="button"
                className="chat-send chat-stop"
                onClick={onStopRun}
                title={copy.stopRun}
                aria-label={copy.stopRun}
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                className="chat-send primary"
                disabled={chatIsEmpty}
                title={chatIsEmpty ? copy.typeMessageFirst : copy.send}
                aria-label={copy.send}
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  )
}

function findLatestOpenStepId(items: readonly InteractionStreamItem[]) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index]
    if (item.type === 'step' && !item.turn.completedAt) {
      return item.turn.id
    }
  }
  return null
}

function isAgentStepBusyTask(busyTask: BusyTask | null) {
  return busyTask?.id === 'execute-action' || busyTask?.id === 'run-agent'
}

function messageToItem(message: AgentConversationMessage): InteractionStreamItem {
  return {
    type: 'message',
    id: `message-${message.id}`,
    message,
  }
}

function formatConversationRole(role: 'user' | 'assistant' | 'observation', copy: AppCopy) {
  if (role === 'assistant') {
    return copy.assistant
  }
  if (role === 'observation') {
    return copy.observation
  }
  return copy.user
}
