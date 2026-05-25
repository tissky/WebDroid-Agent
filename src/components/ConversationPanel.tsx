import type { AppCopy } from '../lib/appCopy'
import type { AgentStep } from '../lib/agent'
import type { BusyTask } from '../lib/busyTask'
import type { InteractionStreamItem } from '../lib/interactionStream'
import type { AgentConversationMessage } from '../lib/openAiTypes'
import type { AgentThreadSummary } from '../lib/threadStore'
import { ChatPanel } from './ChatPanel'
import { PendingActionCard } from './PendingActionCard'

export type ConversationPanelProps = {
  activeThreadId: string
  busyTask: BusyTask | null
  chatInput: string
  conversation: AgentConversationMessage[]
  interactionItems?: InteractionStreamItem[]
  copy: AppCopy
  historySidebarOpen: boolean
  pendingStep: AgentStep | null
  threadSummaries: AgentThreadSummary[]
  onChatInputChange: (value: string) => void
  onCloseHistorySidebar: () => void
  onDeleteThread: (threadId: string) => void
  onExecutePendingStep: () => void
  onSelectThread: (threadId: string) => void
  onStartNewChat: () => void
  onStopRun: () => void
  onSubmitChatMessage: () => void
  onToggleHistorySidebar: () => void
}

export function ConversationPanel({
  activeThreadId,
  busyTask,
  chatInput,
  conversation,
  interactionItems,
  copy,
  historySidebarOpen,
  onChatInputChange,
  onCloseHistorySidebar,
  onDeleteThread,
  onExecutePendingStep,
  onSelectThread,
  onStartNewChat,
  onStopRun,
  onSubmitChatMessage,
  onToggleHistorySidebar,
  pendingStep,
  threadSummaries,
}: ConversationPanelProps) {
  return (
    <aside className="panel conversation-panel">
      <ChatPanel
        activeThreadId={activeThreadId}
        busyTask={busyTask}
        chatInput={chatInput}
        conversation={conversation}
        interactionItems={interactionItems}
        copy={copy}
        historySidebarOpen={historySidebarOpen}
        threadSummaries={threadSummaries}
        onChatInputChange={onChatInputChange}
        onCloseHistorySidebar={onCloseHistorySidebar}
        onDeleteThread={onDeleteThread}
        onSelectThread={onSelectThread}
        onStartNewChat={onStartNewChat}
        onStopRun={onStopRun}
        onSubmitChatMessage={onSubmitChatMessage}
        onToggleHistorySidebar={onToggleHistorySidebar}
      />

      {pendingStep ? (
        <PendingActionCard
          busyTask={busyTask}
          copy={copy}
          onExecutePendingStep={onExecutePendingStep}
          pendingStep={pendingStep}
        />
      ) : null}
    </aside>
  )
}
