import type { AppCopy } from '../lib/appCopy'

export type DeviceOptionsSectionProps = {
  actionSettleMs: number
  confirmSensitiveActions: boolean
  copy: AppCopy
  doubleTapIntervalMs: number
  keyboardStepMs: number
  preferAdbKeyboard: boolean
  onActionSettleMsChange: (value: number) => void
  onConfirmSensitiveActionsChange: (value: boolean) => void
  onDoubleTapIntervalMsChange: (value: number) => void
  onKeyboardStepMsChange: (value: number) => void
  onPreferAdbKeyboardChange: (value: boolean) => void
}

export function DeviceOptionsSection({
  actionSettleMs,
  confirmSensitiveActions,
  copy,
  doubleTapIntervalMs,
  keyboardStepMs,
  preferAdbKeyboard,
  onActionSettleMsChange,
  onConfirmSensitiveActionsChange,
  onDoubleTapIntervalMsChange,
  onKeyboardStepMsChange,
  onPreferAdbKeyboardChange,
}: DeviceOptionsSectionProps) {
  return (
    <details className="compact-section">
      <summary>{copy.deviceOptions}</summary>
      <div className="device-options-panel">
        <label className="toggle">
          <input
            type="checkbox"
            checked={preferAdbKeyboard}
            onChange={(event) => onPreferAdbKeyboardChange(event.target.checked)}
          />
          <span>{copy.useAdbKeyboard}</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={confirmSensitiveActions}
            onChange={(event) => onConfirmSensitiveActionsChange(event.target.checked)}
          />
          <span>{copy.confirmSensitiveActions}</span>
        </label>
        <div className="timing-grid">
          <label>
            {copy.actionSettle}
            <input
              type="number"
              min={100}
              max={5000}
              step={50}
              value={actionSettleMs}
              onChange={(event) => onActionSettleMsChange(Number(event.target.value))}
            />
          </label>
          <label>
            {copy.doubleTapInterval}
            <input
              type="number"
              min={20}
              max={1000}
              step={5}
              value={doubleTapIntervalMs}
              onChange={(event) => onDoubleTapIntervalMsChange(Number(event.target.value))}
            />
          </label>
          <label>
            {copy.keyboardStep}
            <input
              type="number"
              min={100}
              max={5000}
              step={50}
              value={keyboardStepMs}
              onChange={(event) => onKeyboardStepMsChange(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="capability-grid" aria-label={copy.supportedActions}>
          {copy.capabilities.map((capability) => (
            <span key={capability}>{capability}</span>
          ))}
        </div>
      </div>
    </details>
  )
}
