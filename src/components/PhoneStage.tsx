import { Check, Maximize2, Minimize2, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useState, type MouseEvent, type WheelEvent } from 'react'
import type { AgentAction } from '../lib/actions'
import { buildActionPreview } from '../lib/actions'
import type { AppCopy } from '../lib/appCopy'
import type { AgentStep } from '../lib/agent'
import { ScreenshotLightbox, type ScreenshotSource } from './ScreenshotLightbox'

export function PhoneStage({
  copy,
  displayedScreenshot,
  onRunInteractiveAction,
  pendingStep,
}: {
  copy: AppCopy
  displayedScreenshot: ScreenshotSource | null
  onRunInteractiveAction?: (action: AgentAction) => void
  pendingStep: AgentStep | null
}) {
  const [draftAction, setDraftAction] = useState<AgentAction | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const hasScreenshot = displayedScreenshot !== null
  const isFullscreenPreview = hasScreenshot && fullscreen
  const stageLabel = displayedScreenshot ? copy.androidScreenshot : copy.noScreenshot
  const zoomPercent = Math.round(zoom * 100)
  const surfacePercent = hasScreenshot ? zoomPercent : 100

  useEffect(() => {
    if (!isFullscreenPreview) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setFullscreen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isFullscreenPreview])

  function pointerToScreenPoint(event: MouseEvent<HTMLElement>) {
    if (!displayedScreenshot) {
      return { x: 0, y: 0 }
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const xRatio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0
    const yRatio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0
    return {
      x: Math.round(clamp(xRatio, 0, 1) * displayedScreenshot.screen.width),
      y: Math.round(clamp(yRatio, 0, 1) * displayedScreenshot.screen.height),
    }
  }

  function startInteraction(event: MouseEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragStart(pointerToScreenPoint(event))
  }

  function finishInteraction(event: MouseEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (!dragStart) {
      return
    }

    const end = pointerToScreenPoint(event)
    const distance = Math.hypot(end.x - dragStart.x, end.y - dragStart.y)
    setDraftAction(
      distance > 24
        ? {
            action: 'swipe',
            fromX: dragStart.x,
            fromY: dragStart.y,
            toX: end.x,
            toY: end.y,
            durationMs: 400,
          }
        : {
            action: 'tap',
            x: dragStart.x,
            y: dragStart.y,
          },
    )
    setDragStart(null)
  }

  function changeZoom(delta: number) {
    setZoom((current) => clamp(Math.round((current + delta) * 100) / 100, 1, 3))
  }

  function zoomWithWheel(event: WheelEvent<HTMLElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return
    }

    event.preventDefault()
    changeZoom(event.deltaY < 0 ? 0.25 : -0.25)
  }

  return (
    <section
      className={isFullscreenPreview ? 'phone-stage phone-stage-fullscreen' : 'phone-stage'}
      aria-label={stageLabel}
    >
      <>
        <div
          className={isFullscreenPreview ? 'phone-frame phone-frame-fullscreen' : 'phone-frame'}
          role={isFullscreenPreview ? 'dialog' : undefined}
          aria-modal={isFullscreenPreview ? true : undefined}
          aria-label={isFullscreenPreview ? copy.fullscreenPhonePreview : undefined}
        >
          <div className="phone-viewport" onWheel={zoomWithWheel}>
            <div
              className="phone-zoom-surface"
              style={{ height: `${surfacePercent}%`, width: `${surfacePercent}%` }}
            >
              {displayedScreenshot ? (
                <ScreenshotLightbox
                  screenshot={displayedScreenshot}
                  title={copy.androidScreenshot}
                  thumbnailAlt={copy.androidScreenshot}
                  expandedAlt={copy.expandedAndroidScreenshot}
                  openButtonLabel={copy.openScreenshotFor(copy.androidScreenshot)}
                  dialogLabel={copy.screenshotDialogFor(copy.androidScreenshot)}
                  closeLabel={copy.closeScreenshotPreview}
                  thumbnailClassName="phone-screenshot-button"
                >
                  {pendingStep ? (
                    <ActionOverlay action={pendingStep.action} screen={displayedScreenshot.screen} />
                  ) : null}
                  {draftAction ? (
                    <ActionOverlay action={draftAction} screen={displayedScreenshot.screen} />
                  ) : null}
                  {onRunInteractiveAction ? (
                    <span
                      aria-label={copy.screenshotInteractionLayer}
                      className="screenshot-command-layer"
                      role="presentation"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                      onMouseDown={startInteraction}
                      onMouseLeave={() => setDragStart(null)}
                      onMouseUp={finishInteraction}
                    />
                  ) : null}
                </ScreenshotLightbox>
              ) : (
                <div className="phone-screen-placeholder" aria-hidden="true" />
              )}
            </div>
          </div>
          {displayedScreenshot && draftAction ? (
            <div className="screenshot-command-draft">
              <span>{previewInteractiveAction(draftAction)}</span>
              <button
                type="button"
                aria-label={copy.runGeneratedAction}
                onClick={() => onRunInteractiveAction?.(draftAction)}
              >
                <Check size={14} />
                {copy.execute}
              </button>
              <button
                type="button"
                aria-label={copy.clearGeneratedAction}
                onClick={() => setDraftAction(null)}
              >
                <X size={14} />
                {copy.clear}
              </button>
            </div>
          ) : null}
        </div>
        {hasScreenshot ? (
          <div className="phone-zoom-controls" aria-label={copy.screenshotZoomControls}>
            <button
              type="button"
              aria-label={copy.zoomOutScreenshot}
              title={copy.zoomOutScreenshot}
              onClick={() => changeZoom(-0.25)}
              disabled={zoom <= 1}
            >
              <ZoomOut size={14} />
            </button>
            <span>{zoomPercent}%</span>
            <button
              type="button"
              aria-label={copy.zoomInScreenshot}
              title={copy.zoomInScreenshot}
              onClick={() => changeZoom(0.25)}
              disabled={zoom >= 3}
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              aria-label={copy.resetScreenshotZoom}
              title={copy.resetScreenshotZoom}
              onClick={() => setZoom(1)}
              disabled={zoom === 1}
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              aria-label={fullscreen ? copy.exitPhoneFullscreen : copy.showPhoneFullscreen}
              title={fullscreen ? copy.exitPhoneFullscreen : copy.showPhoneFullscreen}
              onClick={() => setFullscreen((current) => !current)}
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        ) : null}
      </>
    </section>
  )
}

function previewInteractiveAction(action: AgentAction) {
  if (action.action === 'swipe') {
    return `swipe (${action.fromX}, ${action.fromY}) -> (${action.toX}, ${action.toY})`
  }
  return buildActionPreview(action)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function ActionOverlay({
  action,
  screen,
}: {
  action: AgentAction
  screen: { width: number; height: number }
}) {
  if (action.action === 'tap' || action.action === 'long_press' || action.action === 'double_tap') {
    return (
      <span
        className={`tap-marker ${action.action}`}
        style={{
          left: `${(action.x / screen.width) * 100}%`,
          top: `${(action.y / screen.height) * 100}%`,
        }}
      />
    )
  }

  if (action.action === 'swipe') {
    return (
      <>
        <span
          className="swipe-marker start"
          style={{
            left: `${(action.fromX / screen.width) * 100}%`,
            top: `${(action.fromY / screen.height) * 100}%`,
          }}
        />
        <span
          className="swipe-marker end"
          style={{
            left: `${(action.toX / screen.width) * 100}%`,
            top: `${(action.toY / screen.height) * 100}%`,
          }}
        />
      </>
    )
  }

  return null
}
