import { RotateCcw, Trash2 } from 'lucide-react'
import type { LogEntry } from '../lib/runLogEntries'
import { ScreenshotLightbox } from './ScreenshotLightbox'

export type { LogEntry } from '../lib/runLogEntries'

export type RunLogLabels = {
  clear: string
  closeScreenshotPreview: string
  empty: string
  openScreenshotFor: (title: string) => string
  screenshotDialogFor: (title: string) => string
  title: string
  screenshotFor: (title: string) => string
  expandedScreenshotFor: (title: string) => string
}

export type RunLogProps = {
  logs: LogEntry[]
  onClear: () => void
  labels?: RunLogLabels
}

type StepTimelineProps = {
  timeline: NonNullable<LogEntry['timeline']>
}

type TimelineFieldProps = {
  label: string
  value: string
}

export function RunLog({
  logs,
  onClear,
  labels = {
    clear: 'Clear',
    closeScreenshotPreview: 'Close screenshot preview',
    empty: 'No events yet',
    openScreenshotFor: (title: string) => `Open screenshot for ${title}`,
    screenshotDialogFor: (title: string) => `Screenshot for ${title}`,
    title: 'Run Log',
    screenshotFor: (title: string) => `Screenshot for ${title}`,
    expandedScreenshotFor: (title: string) => `Expanded screenshot for ${title}`,
  },
}: RunLogProps) {
  return (
    <section className="log-section">
      <div className="panel-title log-title">
        <span>
          <RotateCcw size={18} />
          <h2>{labels.title}</h2>
        </span>
        <button type="button" onClick={onClear} disabled={logs.length === 0}>
          <Trash2 size={16} />
          {labels.clear}
        </button>
      </div>
      <div className="log-list">
        {logs.length === 0 ? <p className="muted">{labels.empty}</p> : null}
        {logs.map((entry) => (
          <article
            className={`log-entry ${entry.tone}${entry.screenshot ? ' with-screenshot' : ''}`}
            key={entry.id}
          >
            <div className="log-entry-content">
              <time>{entry.time}</time>
              <strong>{entry.title}</strong>
            </div>
            {entry.detail || entry.timeline || entry.screenshot ? (
              <div className="log-entry-body">
                <div className="log-entry-text">
                  {entry.timeline ? <StepTimeline timeline={entry.timeline} /> : null}
                  {entry.detail ? <pre>{entry.detail}</pre> : null}
                </div>
                {entry.screenshot ? (
                  <div className="log-entry-media">
                    <ScreenshotLightbox
                      screenshot={entry.screenshot}
                      title={entry.title}
                      thumbnailAlt={labels.screenshotFor(entry.title)}
                      expandedAlt={labels.expandedScreenshotFor(entry.title)}
                      openButtonLabel={labels.openScreenshotFor(entry.title)}
                      dialogLabel={labels.screenshotDialogFor(entry.title)}
                      closeLabel={labels.closeScreenshotPreview}
                      thumbnailClassName="log-screenshot-button"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function StepTimeline({ timeline }: StepTimelineProps) {
  return (
    <div className="step-timeline">
      <div className="step-timeline-header">
        {timeline.step ? <span>Step {timeline.step}</span> : null}
        {timeline.currentApp ? <strong>{timeline.currentApp}</strong> : null}
        {timeline.packageName ? <code>{timeline.packageName}</code> : null}
      </div>
      {timeline.modelOutput ? (
        <TimelineField label="Model output" value={timeline.modelOutput} />
      ) : null}
      {timeline.actionPreview || timeline.executionActionPreview ? (
        <TimelineField
          label="Parsed action"
          value={[
            timeline.actionPreview,
            timeline.executionActionPreview &&
            timeline.executionActionPreview !== timeline.actionPreview
              ? timeline.executionActionPreview
              : null,
          ]
            .filter(Boolean)
            .join('\n')}
        />
      ) : null}
      {timeline.executionResult ? (
        <TimelineField label="Execution result" value={timeline.executionResult} />
      ) : null}
    </div>
  )
}

function TimelineField({ label, value }: TimelineFieldProps) {
  return (
    <div className="step-timeline-field">
      <span>{label}</span>
      <pre>{value}</pre>
    </div>
  )
}
