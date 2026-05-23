import {
  Check,
  CircleStop,
  Download,
  Loader2,
  MessageSquare,
  Plus,
  Play,
  RotateCcw,
  Send,
  StepForward,
} from 'lucide-react'
import { buildActionPreview } from '../lib/actionPreview'
import type { AgentAction } from '../lib/actionTypes'
import type { AppCopy } from '../lib/appCopy'
import type { AgentStep } from '../lib/agent'
import type { BusyTask } from '../lib/busyTask'
import type { AgentConversationMessage } from '../lib/openAiTypes'
import type { TaskTemplate } from '../lib/taskTemplates'

export type RunPanelProps = {
  autoExecute: boolean
  busyTask: BusyTask | null
  canRun: boolean
  chatInput: string
  conversation: AgentConversationMessage[]
  copy: AppCopy
  logsCount: number
  maxSteps: number
  pendingStep: AgentStep | null
  taskTemplates: TaskTemplate[]
  onAutoExecuteChange: (value: boolean) => void
  onChatInputChange: (value: string) => void
  onExecutePendingStep: () => void
  onExportRunLog: () => void
  onMaxStepsChange: (value: number) => void
  onPlanNextStep: () => void
  onResetSession: () => void
  onRunAutoLoop: () => void
  onStartNewChat: () => void
  onStopRun: () => void
  onSubmitChatMessage: () => void
  onTaskTemplateSelect: (prompt: string) => void
}

export function RunPanel({
  autoExecute,
  busyTask,
  canRun,
  chatInput,
  conversation,
  copy,
  logsCount,
  maxSteps,
  onAutoExecuteChange,
  onChatInputChange,
  onExecutePendingStep,
  onExportRunLog,
  onMaxStepsChange,
  onPlanNextStep,
  onResetSession,
  onRunAutoLoop,
  onStartNewChat,
  onStopRun,
  onSubmitChatMessage,
  onTaskTemplateSelect,
  pendingStep,
  taskTemplates,
}: RunPanelProps) {
  const chatIsEmpty = chatInput.trim().length === 0
  const runActionLabel = autoExecute ? copy.runAgent : copy.planNextStep
  const isBusy = Boolean(busyTask)
  const isRunningAgent = busyTask?.id === 'run-agent'
  const runActionTitle = busyTask ? copy.waitForCurrentRun : copy.runUnavailable
  const runActionDisabled = !canRun
  const runAction = autoExecute ? onRunAutoLoop : onPlanNextStep
  const runIcon =
    isRunningAgent ? (
      <Loader2 className="spin" size={16} />
    ) : autoExecute ? (
      <Play size={16} />
    ) : (
      <StepForward size={16} />
    )

  return (
    <>
      <div className="panel-title run-panel-title">
        <div className="panel-title-main">
          <MessageSquare size={18} />
          <h2>{copy.chat}</h2>
        </div>
        <button
          type="button"
          className="panel-title-action"
          onClick={onStartNewChat}
          disabled={isBusy}
          title={busyTask ? copy.waitForCurrentRun : copy.newChat}
        >
          <Plus size={16} />
          {copy.newChat}
        </button>
      </div>
      <details className="compact-section">
        <summary>{copy.conversation}</summary>
        <div className="conversation-list" aria-label={copy.conversation}>
          {conversation.length === 0 ? <p className="muted">{copy.noMessages}</p> : null}
          {conversation.map((message) => (
            <article className={`chat-message ${message.role}`} key={message.id}>
              <span>{formatConversationRole(message.role, copy)}</span>
              <p>{message.content}</p>
            </article>
          ))}
        </div>
      </details>
      <label>
        {copy.taskTemplate}
        <select
          value=""
          onChange={(event) => {
            const template = taskTemplates.find((candidate) => candidate.id === event.target.value)
            if (template) {
              onTaskTemplateSelect(template.prompt)
            }
          }}
          disabled={isBusy}
        >
          <option value="">{copy.chooseTaskTemplate}</option>
          {taskTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title}
            </option>
          ))}
        </select>
      </label>
      <section className="chat-composer">
        <label>
          {copy.chatMessage}
          <textarea
            value={chatInput}
            onChange={(event) => onChatInputChange(event.target.value)}
            rows={4}
            placeholder={copy.chatPlaceholder}
          />
        </label>
        <div className="composer-actions">
          <button
            type="button"
            className="wide"
            onClick={onSubmitChatMessage}
            disabled={chatIsEmpty}
            title={chatIsEmpty ? copy.typeMessageFirst : copy.send}
          >
            <Send size={16} />
            {copy.send}
          </button>
        </div>
      </section>

      <section className="agent-run-actions" aria-label={copy.agentRun}>
        <div className="run-mode" role="radiogroup" aria-label={copy.executionMode}>
          <span className="run-mode-label">{copy.executionMode}</span>
          <label className="run-mode-option">
            <input
              type="radio"
              name="execution-mode"
              checked={!autoExecute}
              onChange={() => onAutoExecuteChange(false)}
              disabled={isBusy}
            />
            <span>
              <StepForward size={16} />
              {copy.manualMode}
            </span>
          </label>
          <label className="run-mode-option">
            <input
              type="radio"
              name="execution-mode"
              checked={autoExecute}
              onChange={() => onAutoExecuteChange(true)}
              disabled={isBusy}
            />
            <span>
              <Play size={16} />
              {copy.autoMode}
            </span>
          </label>
        </div>
        <button
          type="button"
          className="wide primary run-cta"
          onClick={runAction}
          disabled={runActionDisabled}
          title={runActionDisabled ? runActionTitle : runActionLabel}
        >
          {runIcon}
          {isRunningAgent ? copy.running : runActionLabel}
        </button>
      </section>

      <details className="compact-section">
        <summary>{copy.runOptions}</summary>
        <div className="run-options-panel">
          <label>
            {copy.maxSteps}
            <input
              type="number"
              min={1}
              max={200}
              value={maxSteps}
              onChange={(event) => onMaxStepsChange(Number(event.target.value))}
            />
          </label>
          <button type="button" className="wide danger" onClick={onStopRun} disabled={!busyTask}>
            <CircleStop size={16} />
            {copy.stop}
          </button>
          <div className="button-row">
            <button type="button" onClick={onResetSession} disabled={isBusy}>
              <RotateCcw size={16} />
              {copy.reset}
            </button>
            <button type="button" onClick={onExportRunLog} disabled={logsCount === 0}>
              <Download size={16} />
              {copy.export}
            </button>
          </div>
        </div>
      </details>

      <div className={`pending-action ${pendingStep ? 'ready' : 'empty'}`}>
        <div className="pending-header">
          <span>{copy.pendingAction}</span>
          {pendingStep ? <small>{copy.step} {pendingStep.index}</small> : null}
        </div>
        <p>{pendingStep ? buildActionPreview(pendingStep.action) : copy.none}</p>
        {pendingStep ? (
          <button
            type="button"
            className="wide primary"
            onClick={onExecutePendingStep}
            disabled={isBusy}
            title={busyTask ? copy.waitForCurrentRun : pendingActionLabel(pendingStep.action.action, copy)}
          >
            <Check size={16} />
            {pendingActionLabel(pendingStep.action.action, copy)}
          </button>
        ) : null}
      </div>
    </>
  )
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

function pendingActionLabel(action: AgentAction['action'] | undefined, copy: AppCopy) {
  if (
    action === 'take_over' ||
    action === 'note' ||
    action === 'interact' ||
    action === 'call_api'
  ) {
    return copy.acknowledge
  }
  if (action === 'done') {
    return copy.finish
  }
  return copy.execute
}
