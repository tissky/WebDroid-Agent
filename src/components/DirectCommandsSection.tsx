import {
  ArrowLeft,
  CornerDownLeft,
  Home,
  Keyboard,
  MousePointerClick,
  MoveRight,
} from 'lucide-react'
import { useState } from 'react'
import {
  DEFAULT_DIRECT_SWIPE_FROM_X,
  DEFAULT_DIRECT_SWIPE_FROM_Y,
  DEFAULT_DIRECT_SWIPE_TO_X,
  DEFAULT_DIRECT_SWIPE_TO_Y,
  DEFAULT_DIRECT_TAP_X,
  DEFAULT_DIRECT_TAP_Y,
  DEFAULT_SWIPE_DURATION_MS,
} from '../lib/actionDefaults'
import type { AgentAction } from '../lib/actionTypes'
import type { AppCopy } from '../lib/appCopy'
import type { BusyTask } from '../lib/busyTask'

export type DirectCommandsSectionProps = {
  busyTask: BusyTask | null
  connected: boolean
  copy: AppCopy
  onRunDirectAction: (action: AgentAction) => void
  sectionId?: string
}

export function DirectCommandsSection({
  busyTask,
  connected,
  copy,
  onRunDirectAction,
  sectionId,
}: DirectCommandsSectionProps) {
  const [tapX, setTapX] = useState(DEFAULT_DIRECT_TAP_X)
  const [tapY, setTapY] = useState(DEFAULT_DIRECT_TAP_Y)
  const [swipeFromX, setSwipeFromX] = useState(DEFAULT_DIRECT_SWIPE_FROM_X)
  const [swipeFromY, setSwipeFromY] = useState(DEFAULT_DIRECT_SWIPE_FROM_Y)
  const [swipeToX, setSwipeToX] = useState(DEFAULT_DIRECT_SWIPE_TO_X)
  const [swipeToY, setSwipeToY] = useState(DEFAULT_DIRECT_SWIPE_TO_Y)
  const [directText, setDirectText] = useState('')

  const isBusy = Boolean(busyTask)
  const directDisabled = isBusy || !connected

  return (
    <details className="compact-section" id={sectionId}>
      <summary>{copy.directCommands}</summary>
      <section className="direct-command-panel" aria-label={copy.directCommands}>
        <div className="direct-command-grid two">
          <label>
            {copy.tapX}
            <input
              type="number"
              value={tapX}
              onChange={(event) => setTapX(Number(event.target.value))}
            />
          </label>
          <label>
            {copy.tapY}
            <input
              type="number"
              value={tapY}
              onChange={(event) => setTapY(Number(event.target.value))}
            />
          </label>
        </div>
        <button
          type="button"
          className="wide"
          onClick={() => onRunDirectAction({ action: 'tap', x: tapX, y: tapY })}
          disabled={directDisabled}
        >
          <MousePointerClick size={16} />
          {copy.runTap}
        </button>
        <div className="direct-command-grid four">
          <label>
            {copy.swipeFromX}
            <input
              type="number"
              value={swipeFromX}
              onChange={(event) => setSwipeFromX(Number(event.target.value))}
            />
          </label>
          <label>
            {copy.swipeFromY}
            <input
              type="number"
              value={swipeFromY}
              onChange={(event) => setSwipeFromY(Number(event.target.value))}
            />
          </label>
          <label>
            {copy.swipeToX}
            <input
              type="number"
              value={swipeToX}
              onChange={(event) => setSwipeToX(Number(event.target.value))}
            />
          </label>
          <label>
            {copy.swipeToY}
            <input
              type="number"
              value={swipeToY}
              onChange={(event) => setSwipeToY(Number(event.target.value))}
            />
          </label>
        </div>
        <button
          type="button"
          className="wide"
          onClick={() =>
            onRunDirectAction({
              action: 'swipe',
              fromX: swipeFromX,
              fromY: swipeFromY,
              toX: swipeToX,
              toY: swipeToY,
              durationMs: DEFAULT_SWIPE_DURATION_MS,
            })
          }
          disabled={directDisabled}
        >
          <MoveRight size={16} />
          {copy.runSwipe}
        </button>
        <label>
          {copy.directText}
          <input
            type="text"
            value={directText}
            onChange={(event) => setDirectText(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="wide"
          onClick={() => onRunDirectAction({ action: 'input_text', text: directText })}
          disabled={directDisabled || !directText.trim()}
        >
          <Keyboard size={16} />
          {copy.runType}
        </button>
        <div className="button-row">
          <button
            type="button"
            onClick={() => onRunDirectAction({ action: 'back' })}
            disabled={directDisabled}
          >
            <ArrowLeft size={16} />
            {copy.runBack}
          </button>
          <button
            type="button"
            onClick={() => onRunDirectAction({ action: 'home' })}
            disabled={directDisabled}
          >
            <Home size={16} />
            {copy.runHome}
          </button>
          <button
            type="button"
            onClick={() => onRunDirectAction({ action: 'key', key: 'ENTER' })}
            disabled={directDisabled}
          >
            <CornerDownLeft size={16} />
            {copy.runEnter}
          </button>
        </div>
      </section>
    </details>
  )
}
