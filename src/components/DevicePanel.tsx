import {
  ArrowLeft,
  CornerDownLeft,
  Home,
  Keyboard,
  KeyRound,
  Link,
  MousePointerClick,
  MoveRight,
  Play,
  CircleStop,
  Download,
  ScanEye,
  Search,
  Stethoscope,
  Usb,
} from 'lucide-react'
import { useState } from 'react'
import type { DeviceInfo, DeviceState, InstalledApp } from '../adapters/deviceBackend'
import type { AgentAction } from '../lib/actions'
import type { AppCopy } from '../lib/appCopy'
import type { DoctorCheckResult } from '../lib/deviceDoctor'

export function DevicePanel({
  actionSettleMs,
  busy,
  confirmSensitiveActions,
  connected,
  copy,
  currentApp,
  deviceInfo,
  doctorResults,
  deviceState,
  doubleTapIntervalMs,
  installedApps,
  keyboardStepMs,
  onActionSettleMsChange,
  onCaptureScreen,
  onConfirmSensitiveActionsChange,
  onConnectDevice,
  onDisconnectDevice,
  onDoubleTapIntervalMsChange,
  onEnableAdbKeyboard,
  onInstallAdbKeyboard,
  onKeyboardStepMsChange,
  onLaunchInstalledApp,
  onPreferAdbKeyboardChange,
  onRunDirectAction,
  onRunDoctor,
  preferAdbKeyboard,
}: {
  actionSettleMs: number
  busy: string | null
  confirmSensitiveActions: boolean
  connected: boolean
  copy: AppCopy
  currentApp: string
  deviceInfo: DeviceInfo | null
  doctorResults: DoctorCheckResult[]
  deviceState: DeviceState
  doubleTapIntervalMs: number
  installedApps: InstalledApp[]
  keyboardStepMs: number
  onActionSettleMsChange: (value: number) => void
  onCaptureScreen: () => void
  onConfirmSensitiveActionsChange: (value: boolean) => void
  onConnectDevice: () => void
  onDisconnectDevice: () => void
  onDoubleTapIntervalMsChange: (value: number) => void
  onEnableAdbKeyboard: () => void
  onInstallAdbKeyboard: () => void
  onKeyboardStepMsChange: (value: number) => void
  onLaunchInstalledApp: (app: InstalledApp) => void
  onPreferAdbKeyboardChange: (value: boolean) => void
  onRunDirectAction: (action: AgentAction) => void
  onRunDoctor: () => void
  preferAdbKeyboard: boolean
}) {
  const [tapX, setTapX] = useState(0)
  const [tapY, setTapY] = useState(0)
  const [swipeFromX, setSwipeFromX] = useState(540)
  const [swipeFromY, setSwipeFromY] = useState(1800)
  const [swipeToX, setSwipeToX] = useState(540)
  const [swipeToY, setSwipeToY] = useState(600)
  const [directText, setDirectText] = useState('')
  const [appSearch, setAppSearch] = useState('')

  const directDisabled = Boolean(busy) || !connected
  const normalizedAppSearch = appSearch.trim().toLowerCase()
  const visibleApps = installedApps.filter((app) => {
    if (!normalizedAppSearch) {
      return true
    }

    return [app.label, app.packageName, app.activity]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedAppSearch))
  })

  return (
    <>
      <div className="panel-title">
        <Usb size={18} />
        <h2>{copy.device}</h2>
      </div>
      <div className="device-box">
        <span>{deviceInfo?.name || copy.noDevice}</span>
        {connected && deviceInfo ? (
          <details className="device-details">
            <summary>{copy.deviceDetails}</summary>
            <small>{copy.serial}: {deviceInfo.serial}</small>
            <small>{copy.currentApp}: {currentApp}</small>
            {deviceState.packageName ? (
              <small>{copy.package}: {deviceState.packageName}</small>
            ) : null}
            {deviceState.activity ? <small>{copy.activity}: {deviceState.activity}</small> : null}
            {deviceState.keyboard ? <small>{copy.keyboard}: {deviceState.keyboard}</small> : null}
          </details>
        ) : (
          <>
            <small>{copy.usbDebuggingRequired}</small>
            <small>{copy.currentApp}: {currentApp}</small>
          </>
        )}
      </div>
      <div className="button-row">
        <button type="button" onClick={onConnectDevice} disabled={Boolean(busy) || connected}>
          <Link size={16} />
          {copy.connect}
        </button>
        <button type="button" onClick={onDisconnectDevice} disabled={Boolean(busy) || !connected}>
          <CircleStop size={16} />
          {copy.disconnect}
        </button>
      </div>
      <button
        type="button"
        className="wide"
        onClick={onCaptureScreen}
        disabled={Boolean(busy) || !connected}
      >
        <ScanEye size={16} />
        {copy.capture}
      </button>
      <button
        type="button"
        className="wide"
        onClick={onInstallAdbKeyboard}
        disabled={Boolean(busy) || !connected}
      >
        <Download size={16} />
        {copy.installAdbKeyboard}
      </button>
      <button
        type="button"
        className="wide"
        onClick={onEnableAdbKeyboard}
        disabled={Boolean(busy) || !connected}
      >
        <KeyRound size={16} />
        {copy.enableAdbKeyboard}
      </button>
      <button type="button" className="wide" onClick={onRunDoctor} disabled={Boolean(busy)}>
        <Stethoscope size={16} />
        {copy.runDoctor}
      </button>
      <details className="compact-section">
        <summary>{copy.installedApps}</summary>
        <section className="installed-app-panel" aria-label={copy.installedApps}>
          <label className="search-field">
            <span>{copy.appSearch}</span>
            <span>
              <Search size={15} />
              <input
                type="search"
                value={appSearch}
                onChange={(event) => setAppSearch(event.target.value)}
              />
            </span>
          </label>
          {visibleApps.length > 0 ? (
            <div className="installed-app-list">
              {visibleApps.map((app) => {
                const appName = app.label || app.packageName
                return (
                  <article
                    className="installed-app-row"
                    key={`${app.packageName}:${app.activity ?? ''}`}
                  >
                    <div>
                      <strong>{appName}</strong>
                      <small>{app.packageName}</small>
                    </div>
                    <button
                      type="button"
                      aria-label={copy.launchInstalledApp(appName)}
                      onClick={() => onLaunchInstalledApp(app)}
                      disabled={directDisabled}
                    >
                      <Play size={15} />
                      {copy.launchApp}
                    </button>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="muted compact">{copy.noInstalledApps}</p>
          )}
        </section>
      </details>
      <details className="compact-section">
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
                durationMs: 400,
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
      {doctorResults.length > 0 ? (
        <details className="compact-section">
          <summary>{copy.doctorChecks}</summary>
          <section className="doctor-results" aria-label={copy.doctorChecks}>
            <div className="doctor-check-list">
              {doctorResults.map((result) => (
                <article className={`doctor-check ${result.status}`} key={result.id}>
                  <span>{result.status.toUpperCase()}</span>
                  <div>
                    <strong>{result.title}</strong>
                    <p>{result.detail}</p>
                    {result.fix ? <small>{result.fix}</small> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </details>
      ) : null}
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
    </>
  )
}
