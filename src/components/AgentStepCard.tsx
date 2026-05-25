import {
  AlertTriangle,
  ArrowUpDown,
  AppWindow,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Code2,
  Hand,
  Home,
  Keyboard,
  KeyRound,
  LoaderCircle,
  MessageSquareText,
  MousePointerClick,
  PenLine,
  RotateCcw,
  TextCursorInput,
  Touchpad,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AgentAction } from '../lib/actionTypes'
import type { AgentTurn } from '../lib/agentThread'
import type { AppCopy } from '../lib/appCopy'
import { LazyDetails } from './LazyDetails'
import { MarkdownContent } from './MarkdownContent'

type AgentStepCardProps = {
  copy: AppCopy
  isActive: boolean
  turn: AgentTurn
}

type StepTone = 'planned' | 'running' | 'success' | 'failed' | 'review' | 'takeover'

export function AgentStepCard({ copy, isActive, turn }: AgentStepCardProps) {
  const status = formatStepStatus(turn, copy, isActive)
  const packageName = turn.deviceSnapshot.deviceState.packageName
  const result = formatStepResult(turn, copy)
  const stepSummary = formatStepSummary(turn)
  const actionDisplay = getActionDisplay(turn.action, copy)
  const ActionIcon = actionDisplay.icon

  return (
    <article
      className={`agent-step-card ${status.tone}`}
      aria-label={`${copy.step} ${turn.index}: ${actionDisplay.label}`}
    >
      <div className="agent-step-header">
        <div className="agent-step-heading">
          <span className="agent-step-action-icon" aria-hidden="true">
            <ActionIcon size={16} strokeWidth={2} />
          </span>
          <span className="agent-step-action-name">{actionDisplay.label}</span>
        </div>
        <div className="agent-step-header-meta">
          <span className="agent-step-index" title={`${copy.step} ${turn.index}`}>
            #{turn.index}
          </span>
          <span className={`agent-step-status ${status.tone}`}>
            <StepStatusIcon tone={status.tone} />
            {status.label}
          </span>
        </div>
      </div>

      <MarkdownContent className="agent-step-summary" content={stepSummary} />

      <LazyDetails className="agent-step-details" summary={copy.stepDetails}>
        <div className="agent-step-details-grid">
          <span>{copy.stepTiming(turn.timing.totalMs)}</span>
          <span>
            {copy.currentApp}: {turn.deviceSnapshot.currentApp}
          </span>
          {packageName ? <span>{packageName}</span> : null}
        </div>
        <span className="agent-step-detail-title">{copy.stepAction}</span>
        <pre>{turn.preview}</pre>
        <span className="agent-step-detail-title">{copy.stepResult}</span>
        <pre className={result.isPending ? 'pending' : undefined}>{result.text}</pre>
        {turn.modelOutput.trim() ? (
          <>
            <span className="agent-step-detail-title">{copy.stepModelOutput}</span>
            <pre>{turn.modelOutput}</pre>
          </>
        ) : null}
      </LazyDetails>
    </article>
  )
}

const ACTION_ICONS = {
  back: RotateCcw,
  call_api: Code2,
  custom_tool: Code2,
  done: CheckCircle2,
  double_tap: Touchpad,
  home: Home,
  input_text: TextCursorInput,
  interact: Hand,
  key: Keyboard,
  launch: AppWindow,
  long_press: Hand,
  note: PenLine,
  swipe: ArrowUpDown,
  take_over: MessageSquareText,
  tap: MousePointerClick,
  type_secret: KeyRound,
  wait: CircleDot,
} satisfies Record<AgentAction['action'], LucideIcon>

function getActionDisplay(action: AgentAction, copy: AppCopy) {
  return {
    icon: ACTION_ICONS[action.action],
    label: copy.actionNames[action.action],
  }
}

function StepStatusIcon({ tone }: { tone: StepTone }) {
  if (tone === 'success') {
    return <CheckCircle2 size={13} />
  }
  if (tone === 'failed') {
    return <XCircle size={13} />
  }
  if (tone === 'review') {
    return <AlertTriangle size={13} />
  }
  if (tone === 'takeover') {
    return <Hand size={13} />
  }
  if (tone === 'running') {
    return <LoaderCircle className="agent-step-spinner" size={13} />
  }
  return <CircleDashed size={13} />
}

function formatStepStatus(turn: AgentTurn, copy: AppCopy, isActive: boolean) {
  if (turn.status === 'planned') {
    return isActive
      ? { label: copy.stepStatusRunning, tone: 'running' as const }
      : { label: copy.stepStatusPlanned, tone: 'planned' as const }
  }
  if (turn.status === 'failed') {
    return { label: copy.stepStatusFailed, tone: 'failed' as const }
  }
  if (turn.status === 'done') {
    return { label: copy.stepStatusDone, tone: 'success' as const }
  }
  if (turn.status === 'awaiting_review') {
    return { label: copy.stepStatusAwaitingReview, tone: 'review' as const }
  }
  if (turn.status === 'awaiting_takeover') {
    return { label: copy.stepStatusTakeover, tone: 'takeover' as const }
  }
  return { label: copy.stepStatusExecuted, tone: 'success' as const }
}

function formatStepResult(turn: AgentTurn, copy: AppCopy) {
  if (turn.executionResult?.trim()) {
    return { text: turn.executionResult, isPending: false }
  }
  if (turn.status === 'done') {
    return { text: copy.taskComplete, isPending: false }
  }
  if (turn.status === 'awaiting_takeover' && turn.action.action === 'take_over') {
    return { text: turn.action.reason ?? turn.action.message, isPending: false }
  }
  return { text: copy.stepNoResult, isPending: true }
}

function formatStepSummary(turn: AgentTurn) {
  if ('reason' in turn.action && turn.action.reason?.trim()) {
    return turn.action.reason.trim()
  }

  if (turn.action.action === 'done') {
    return turn.action.summary?.trim() || stripPreviewPrefix(turn.preview)
  }
  if (
    turn.action.action === 'take_over' ||
    turn.action.action === 'note' ||
    turn.action.action === 'interact'
  ) {
    return turn.action.message.trim()
  }
  if (turn.action.action === 'call_api') {
    return turn.action.instruction.trim()
  }
  if (turn.action.action === 'input_text') {
    return turn.action.text.trim()
  }

  return stripPreviewPrefix(turn.preview)
}

function stripPreviewPrefix(preview: string) {
  const separatorIndex = preview.lastIndexOf(' - ')
  if (separatorIndex >= 0) {
    return preview.slice(separatorIndex + 3).trim()
  }
  return preview.trim()
}
