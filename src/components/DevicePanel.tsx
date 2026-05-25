import {
  CircleHelp,
  CircleStop,
  KeyRound,
  Link,
  ScanEye,
  Stethoscope,
  Usb,
} from 'lucide-react'
import {
  type DeviceInfo,
  type DeviceState,
  type InstalledApp,
} from '../adapters/deviceTypes'
import type { AgentAction } from '../lib/actionTypes'
import type { AppCopy } from '../lib/appCopy'
import type { BusyTask } from '../lib/busyTask'
import type { DoctorCheckResult } from '../lib/deviceDoctor'
import { DeviceOptionsSection } from './DeviceOptionsSection'
import { DirectCommandsSection } from './DirectCommandsSection'
import { InstalledAppsSection } from './InstalledAppsSection'

export type DevicePanelProps = {
  copy: AppCopy
  state: DevicePanelState
  options: DevicePanelOptions
  actions: DevicePanelActions
  sectionIds?: DevicePanelSectionIds
}

export type DevicePanelState = {
  busyTask: BusyTask | null
  connected: boolean
  currentApp: string
  deviceInfo: DeviceInfo | null
  doctorResults: DoctorCheckResult[]
  deviceState: DeviceState
  installedApps: InstalledApp[]
}

export type DevicePanelOptions = {
  actionSettleMs: number
  confirmSensitiveActions: boolean
  doubleTapIntervalMs: number
  keyboardStepMs: number
  preferAdbKeyboard: boolean
  unrestrictedMode: boolean
}

export type DevicePanelActions = {
  onActionSettleMsChange: (value: number) => void
  onCaptureScreen: () => void
  onConfirmSensitiveActionsChange: (value: boolean) => void
  onConfigureAdbKeyboard: () => void
  onConnectDevice: () => void
  onDisconnectDevice: () => void
  onDoubleTapIntervalMsChange: (value: number) => void
  onKeyboardStepMsChange: (value: number) => void
  onLaunchInstalledApp: (app: InstalledApp) => void
  onPreferAdbKeyboardChange: (value: boolean) => void
  onRunDirectAction: (action: AgentAction) => void
  onRunDoctor: () => void
  onUnrestrictedModeChange: (value: boolean) => void
}

export type DevicePanelSectionIds = {
  device?: string
  deviceOptions?: string
  directCommands?: string
  doctor?: string
  installedApps?: string
}

export function DevicePanel({
  actions,
  copy,
  options,
  sectionIds = {},
  state,
}: DevicePanelProps) {
  const {
    busyTask,
    connected,
    deviceInfo,
    deviceState,
    doctorResults,
    installedApps,
    currentApp,
  } = state
  const {
    actionSettleMs,
    confirmSensitiveActions,
    doubleTapIntervalMs,
    keyboardStepMs,
    preferAdbKeyboard,
    unrestrictedMode,
  } = options
  const {
    onActionSettleMsChange,
    onCaptureScreen,
    onConfirmSensitiveActionsChange,
    onConfigureAdbKeyboard,
    onConnectDevice,
    onDisconnectDevice,
    onDoubleTapIntervalMsChange,
    onKeyboardStepMsChange,
    onLaunchInstalledApp,
    onPreferAdbKeyboardChange,
    onRunDirectAction,
    onRunDoctor,
    onUnrestrictedModeChange,
  } = actions
  const isBusy = Boolean(busyTask)

  return (
    <>
      <section className="config-panel-group" id={sectionIds.device} aria-label={copy.device}>
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
        <div className="adb-connect-row">
          <div className="button-row">
            <button type="button" onClick={onConnectDevice} disabled={isBusy || connected}>
              <Link size={16} />
              {copy.connect}
            </button>
            <button type="button" onClick={onDisconnectDevice} disabled={isBusy || !connected}>
              <CircleStop size={16} />
              {copy.disconnect}
            </button>
          </div>
          <span className="adb-help">
            <button
              type="button"
              className="icon-button adb-help-trigger"
              aria-label={copy.adbConnectionHelpLabel}
              aria-describedby="adb-connection-help"
              title={copy.adbConnectionHelpText}
            >
              <CircleHelp size={16} />
            </button>
            <span className="adb-help-tooltip" id="adb-connection-help" role="tooltip">
              {copy.adbConnectionHelpText}
            </span>
          </span>
        </div>
        <button
          type="button"
          className="wide"
          onClick={onCaptureScreen}
          disabled={isBusy || !connected}
        >
          <ScanEye size={16} />
          {copy.capture}
        </button>
        <button
          type="button"
          className="wide"
          onClick={onConfigureAdbKeyboard}
          disabled={isBusy || !connected}
        >
          <KeyRound size={16} />
          {copy.configureTextInput}
        </button>
      </section>
      <InstalledAppsSection
        busyTask={busyTask}
        connected={connected}
        copy={copy}
        installedApps={installedApps}
        onLaunchInstalledApp={onLaunchInstalledApp}
        sectionId={sectionIds.installedApps}
      />
      <DirectCommandsSection
        busyTask={busyTask}
        connected={connected}
        copy={copy}
        onRunDirectAction={onRunDirectAction}
        sectionId={sectionIds.directCommands}
      />
      <section className="config-panel-group" id={sectionIds.doctor} aria-label={copy.runDoctor}>
        <div className="panel-title">
          <Stethoscope size={18} />
          <h2>{copy.runDoctor}</h2>
        </div>
        <button type="button" className="wide" onClick={onRunDoctor} disabled={isBusy}>
          <Stethoscope size={16} />
          {copy.runDoctor}
        </button>
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
      </section>
      <DeviceOptionsSection
        actionSettleMs={actionSettleMs}
        confirmSensitiveActions={confirmSensitiveActions}
        copy={copy}
        doubleTapIntervalMs={doubleTapIntervalMs}
        keyboardStepMs={keyboardStepMs}
        unrestrictedMode={unrestrictedMode}
        onActionSettleMsChange={onActionSettleMsChange}
        onConfirmSensitiveActionsChange={onConfirmSensitiveActionsChange}
        onDoubleTapIntervalMsChange={onDoubleTapIntervalMsChange}
        onKeyboardStepMsChange={onKeyboardStepMsChange}
        onPreferAdbKeyboardChange={onPreferAdbKeyboardChange}
        onUnrestrictedModeChange={onUnrestrictedModeChange}
        preferAdbKeyboard={preferAdbKeyboard}
        sectionId={sectionIds.deviceOptions}
      />
    </>
  )
}
