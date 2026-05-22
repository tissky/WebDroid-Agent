import {
  AlertTriangle,
  ScanEye,
  Settings as SettingsIcon,
  Usb,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type {
  DeviceInfo,
  DeviceScreenshot,
  DeviceState,
  InstalledApp,
} from './adapters/deviceBackend'
import { ADB_KEYBOARD_APK_URL } from './adapters/deviceBackend'
import { WebAdbDeviceBackend, isWebUsbSupported } from './adapters/webAdbBackend'
import { buildActionPreview, type AgentAction } from './lib/actions'
import {
  addUserMessage,
  createAgentRunner,
  createAgentSession,
  queueUserMessage,
  recordAgentStep,
  runAgentStep,
  type AgentSession,
  type AgentStep,
} from './lib/agent'
import {
  formatDoctorResults,
  runDeviceDoctor,
  summarizeDoctorResults,
  type DoctorCheckResult,
} from './lib/deviceDoctor'
import { createOpenAiClient, type ModelConfig } from './lib/openAiClient'
import { APP_COPY, resolveLocale } from './lib/appCopy'
import { readRepositoryStats, REPOSITORY_API_URL, type RepositoryStats } from './lib/repository'
import { modelScreenshotView } from './lib/screenshotCoordinates'
import { loadSettings, saveSettings } from './lib/settings'
import { TASK_TEMPLATES } from './lib/taskTemplates'
import { createDefaultActionToolRegistry } from './lib/toolRegistry'
import { DevicePanel } from './components/DevicePanel'
import { ModelPanel } from './components/ModelPanel'
import { PhoneStage } from './components/PhoneStage'
import { RunLog, type LogEntry, type LogScreenshot } from './components/RunLog'
import { RunPanel } from './components/RunPanel'
import { SettingsDialog } from './components/SettingsDialog'

function App() {
  const abortRef = useRef<AbortController | null>(null)
  const settings = useMemo(() => loadSettings(), [])
  const sessionRef = useRef<AgentSession>(createAgentSession(settings.task))
  const [conversation, setConversation] = useState(() => [...sessionRef.current.messages])
  const [backend] = useState(() => new WebAdbDeviceBackend())
  const client = useMemo(() => createOpenAiClient(), [])
  const actionToolRegistry = useMemo(() => createDefaultActionToolRegistry(), [])
  const [modelConfig, setModelConfig] = useState<ModelConfig>(settings.modelConfig)
  const [task, setTask] = useState(settings.task)
  const [chatInput, setChatInput] = useState('')
  const [maxSteps, setMaxSteps] = useState(settings.maxSteps)
  const [autoExecute, setAutoExecute] = useState(settings.autoExecute)
  const [preferAdbKeyboard, setPreferAdbKeyboard] = useState(settings.preferAdbKeyboard)
  const [confirmSensitiveActions, setConfirmSensitiveActions] = useState(
    settings.confirmSensitiveActions,
  )
  const [streamResponses, setStreamResponses] = useState(settings.streamResponses)
  const [actionSettleMs, setActionSettleMs] = useState(settings.actionSettleMs)
  const [doubleTapIntervalMs, setDoubleTapIntervalMs] = useState(settings.doubleTapIntervalMs)
  const [keyboardStepMs, setKeyboardStepMs] = useState(settings.keyboardStepMs)
  const [themeMode, setThemeMode] = useState(settings.themeMode)
  const [languageMode, setLanguageMode] = useState(settings.languageMode)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [currentApp, setCurrentApp] = useState<string>('Unknown')
  const [deviceState, setDeviceState] = useState<DeviceState>({ app: 'Unknown' })
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([])
  const [doctorResults, setDoctorResults] = useState<DoctorCheckResult[]>([])
  const [screenshot, setScreenshot] = useState<DeviceScreenshot | null>(null)
  const [pendingStep, setPendingStep] = useState<AgentStep | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [repositoryStats, setRepositoryStats] = useState<RepositoryStats | null>(null)
  const [repositoryStatsStatus, setRepositoryStatsStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle',
  )

  const connected = deviceInfo !== null
  const hasModelConfig = Boolean(modelConfig.baseUrl && modelConfig.apiKey && modelConfig.model)
  const hasConversation = conversation.some((message) => message.role === 'user')
  const canRun = connected && !busy && hasModelConfig && hasConversation
  const displayedScreenshot = screenshot ? modelScreenshotView(screenshot) : null
  const activeLocale = useMemo(() => resolveLocale(languageMode), [languageMode])
  const copy = APP_COPY[activeLocale]
  const taskTemplates = TASK_TEMPLATES[activeLocale]

  useEffect(() => {
    saveSettings({
      modelConfig,
      task,
      maxSteps,
      autoExecute,
      preferAdbKeyboard,
      confirmSensitiveActions,
      streamResponses,
      actionSettleMs,
      doubleTapIntervalMs,
      keyboardStepMs,
      themeMode,
      languageMode,
    })
  }, [
    actionSettleMs,
    autoExecute,
    confirmSensitiveActions,
    doubleTapIntervalMs,
    keyboardStepMs,
    languageMode,
    maxSteps,
    modelConfig,
    preferAdbKeyboard,
    streamResponses,
    task,
    themeMode,
  ])

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')

    function syncSystemTheme() {
      if (themeMode === 'system' && media?.matches) {
        document.documentElement.dataset.systemTheme = 'dark'
        return
      }
      delete document.documentElement.dataset.systemTheme
    }

    syncSystemTheme()
    media?.addEventListener('change', syncSystemTheme)
    return () => media?.removeEventListener('change', syncSystemTheme)
  }, [themeMode])

  useEffect(() => {
    document.documentElement.lang = activeLocale
  }, [activeLocale])

  useEffect(() => {
    backend.setPreferAdbKeyboard(preferAdbKeyboard)
  }, [backend, preferAdbKeyboard])

  useEffect(() => {
    backend.setTimingConfig({
      actionSettleMs,
      doubleTapIntervalMs,
      keyboardStepMs,
    })
  }, [actionSettleMs, backend, doubleTapIntervalMs, keyboardStepMs])

  useEffect(() => {
    if (!settingsOpen || repositoryStatsStatus !== 'idle') {
      return
    }

    async function loadRepositoryStats() {
      if (typeof fetch !== 'function') {
        setRepositoryStatsStatus('error')
        return
      }

      setRepositoryStatsStatus('loading')
      try {
        const response = await fetch(REPOSITORY_API_URL)
        if (!response.ok) {
          throw new Error(`GitHub responded with ${response.status}`)
        }
        const payload = await response.json()
        setRepositoryStats(readRepositoryStats(payload))
        setRepositoryStatsStatus('done')
      } catch {
        setRepositoryStatsStatus('error')
      }
    }

    void loadRepositoryStats()
  }, [settingsOpen, repositoryStatsStatus])

  function updateConfig<Key extends keyof ModelConfig>(key: Key, value: ModelConfig[Key]) {
    setModelConfig((current) => {
      return { ...current, [key]: value }
    })
  }

  function addLog(entry: Omit<LogEntry, 'id' | 'time'>) {
    setLogs((current) => [
      {
        ...entry,
        id: Date.now() + Math.random(),
        time: new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date()),
      },
      ...current,
    ])
  }

  function applyDeviceSnapshot({
    currentApp,
    deviceState,
    screenshot,
  }: {
    currentApp: string
    deviceState: DeviceState
    screenshot: DeviceScreenshot
  }) {
    setScreenshot(screenshot)
    setCurrentApp(currentApp)
    setDeviceState(deviceState)
  }

  async function refreshDisplayedSnapshot() {
    const nextScreenshot = await backend.screenshot()
    const nextDeviceState = await backend.getDeviceState()
    applyDeviceSnapshot({
      screenshot: nextScreenshot,
      currentApp: nextDeviceState.app,
      deviceState: nextDeviceState,
    })
    return { screenshot: nextScreenshot, deviceState: nextDeviceState }
  }

  function toLogScreenshot(value: DeviceScreenshot | null | undefined): LogScreenshot | undefined {
    if (!value) {
      return undefined
    }

    const view = modelScreenshotView(value)
    return {
      dataUrl: view.dataUrl,
      screen: view.screen,
    }
  }

  function ensureSession() {
    return sessionRef.current
  }

  function syncConversation() {
    setConversation([...sessionRef.current.messages])
    setTask(sessionRef.current.task)
  }

  function resetSession() {
    sessionRef.current = createAgentSession(task)
    setPendingStep(null)
    syncConversation()
    addLog({ tone: 'info', title: 'Agent context reset' })
  }

  function startNewChat() {
    sessionRef.current = createAgentSession('')
    setChatInput('')
    setPendingStep(null)
    syncConversation()
    addLog({ tone: 'info', title: 'New chat started' })
  }

  function clearRunLog() {
    setLogs([])
  }

  function applyTaskTemplate(prompt: string) {
    setChatInput(prompt)
  }

  function confirmSensitiveAction(message: string) {
    if (!confirmSensitiveActions) {
      return true
    }

    return window.confirm(
      [
        `${copy.sensitiveActionTitle}:`,
        '',
        message,
        '',
        copy.sensitiveActionPrompt,
      ].join('\n'),
    )
  }

  function formatStepDetail(step: AgentStep) {
    const timingDetail = [
      `capture ${step.timing.captureMs}ms`,
      `app ${step.timing.currentAppMs}ms`,
      `model ${step.timing.modelMs}ms`,
      `parse ${step.timing.parseMs}ms`,
      `total ${step.timing.totalMs}ms`,
    ].join(', ')

    return [
      `Current app: ${step.currentApp}`,
      `Timing: ${timingDetail}`,
      step.modelOutput,
    ].join('\n\n')
  }

  function buildStepTimeline(step: AgentStep, executionResult?: string): LogEntry['timeline'] {
    return {
      step: step.index,
      currentApp: step.currentApp,
      packageName: step.deviceState.packageName,
      modelOutput: step.modelOutput,
      actionPreview: buildActionPreview(step.action),
      executionActionPreview: buildActionPreview(step.executionAction),
      executionResult,
    }
  }

  function exportRunLog() {
    const payload = {
      exportedAt: new Date().toISOString(),
      device: deviceInfo,
      currentApp,
      deviceState,
      model: {
        ...modelConfig,
        apiKey: modelConfig.apiKey ? '<redacted>' : '',
      },
      streamResponses,
      timing: {
        actionSettleMs,
        doubleTapIntervalMs,
        keyboardStepMs,
      },
      autoExecute,
      maxSteps,
      task,
      session: sessionRef.current,
      logs,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `webdroid-agent-run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    addLog({ tone: 'ok', title: 'Run log exported' })
  }

  async function runTask(label: string, action: () => Promise<void>) {
    setBusy(label)
    setError(null)
    try {
      await action()
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(message)
      addLog({ tone: 'error', title: label, detail: message })
    } finally {
      setBusy(null)
    }
  }

  async function connectDevice() {
    await runTask('Connect device', async () => {
      const info = await backend.connect()
      setDeviceInfo(info)
      addLog({ tone: 'ok', title: 'Device connected', detail: `${info.name} (${info.serial})` })
      await captureScreen()
      await refreshInstalledApps()
    })
  }

  async function disconnectDevice() {
    await runTask('Disconnect device', async () => {
      await backend.disconnect()
      setDeviceInfo(null)
      setCurrentApp('Unknown')
      setDeviceState({ app: 'Unknown' })
      setInstalledApps([])
      setDoctorResults([])
      setScreenshot(null)
      setPendingStep(null)
      addLog({ tone: 'info', title: 'Device disconnected' })
    })
  }

  async function captureScreen() {
    await runTask('Capture screen', async () => {
      const { screenshot: nextScreenshot, deviceState: nextDeviceState } =
        await refreshDisplayedSnapshot()
      const screenshotSize = `${nextScreenshot.screen.width}x${nextScreenshot.screen.height}`
      addLog({
        tone: 'ok',
        title: 'Screen captured',
        detail: [screenshotSize, formatDeviceState(nextDeviceState)].join('\n'),
        screenshot: toLogScreenshot(nextScreenshot),
      })
    })
  }

  async function refreshInstalledApps() {
    if (!backend.getInstalledApps) {
      setInstalledApps([])
      return
    }

    try {
      setInstalledApps(await backend.getInstalledApps())
    } catch {
      setInstalledApps([])
    }
  }

  async function enableAdbKeyboard() {
    await runTask('Enable ADB Keyboard', async () => {
      const result = await backend.enableAdbKeyboard()
      setPreferAdbKeyboard(true)
      addLog({ tone: 'ok', title: 'ADB Keyboard enabled', detail: result })
    })
  }

  async function installAdbKeyboard() {
    await runTask(copy.installAdbKeyboard, async () => {
      if (typeof fetch !== 'function') {
        throw new Error('This browser cannot download the ADB Keyboard APK.')
      }

      const response = await fetch(ADB_KEYBOARD_APK_URL)
      if (!response.ok) {
        throw new Error(`Failed to download ADB Keyboard APK: HTTP ${response.status}.`)
      }

      const apkBytes = new Uint8Array(await response.arrayBuffer())
      const installResult = await backend.installAdbKeyboard(apkBytes)
      const enableResult = await backend.enableAdbKeyboard()
      setPreferAdbKeyboard(true)
      const nextDeviceState = await backend.getDeviceState().catch(() => null)
      if (nextDeviceState) {
        setCurrentApp(nextDeviceState.app)
        setDeviceState(nextDeviceState)
      }
      addLog({
        tone: 'ok',
        title: copy.adbKeyboardInstalled,
        detail: [installResult, enableResult].filter(Boolean).join('\n'),
      })
    })
  }

  async function runDoctor() {
    await runTask(copy.runDoctor, async () => {
      const results = await runDeviceDoctor({
        connected,
        device: backend,
        deviceInfo,
        fetcher: globalThis.fetch,
        isWebUsbSupported,
        modelConfig,
      })
      setDoctorResults(results)
      addLog({
        tone: results.some((result) => result.status === 'error')
          ? 'error'
          : results.some((result) => result.status === 'warn')
            ? 'warn'
            : 'ok',
        title: copy.doctorSummary,
        detail: [summarizeDoctorResults(results), formatDoctorResults(results)].join('\n\n'),
      })
    })
  }

  async function runDirectAction(action: AgentAction) {
    await runTask(copy.directCommand, async () => {
      const result = await backend.execute(action)
      addLog({
        tone: 'ok',
        title: copy.directCommand,
        detail: [buildActionPreview(action), result].filter(Boolean).join('\n'),
      })
      await refreshDisplayedSnapshot()
    })
  }

  function launchInstalledApp(app: InstalledApp) {
    void runDirectAction({
      action: 'launch',
      app: app.label || app.packageName,
      packageName: app.packageName,
    })
  }

  function toggleAdbKeyboard(value: boolean) {
    setPreferAdbKeyboard(value)
    backend.setPreferAdbKeyboard(value)
  }

  async function planNextStep() {
    await runTask('Plan next action', async () => {
      const session = ensureSession()
      const step = await runAgentStep({
        device: backend,
        client,
        modelConfig: { ...modelConfig, stream: streamResponses },
        task: session.task,
        session,
        index: session.history.length + 1,
        onSnapshot: applyDeviceSnapshot,
      })
      setScreenshot(step.screenshot)
      setCurrentApp(step.currentApp)
      setDeviceState(step.deviceState)
      setPendingStep(step)
      syncConversation()
      addLog({
        tone: 'info',
        title: `Step ${step.index}: ${step.preview}`,
        detail: formatStepDetail(step),
        screenshot: toLogScreenshot(step.screenshot),
        timeline: buildStepTimeline(step),
      })
    })
  }

  async function executePendingStep() {
    if (!pendingStep) {
      return
    }

    await runTask('Execute action', async () => {
      if (pendingStep.action.action === 'done') {
        recordAgentStep(ensureSession(), pendingStep)
        addLog({ tone: 'ok', title: 'Task complete', detail: pendingStep.action.summary })
        setPendingStep(null)
        syncConversation()
        return
      }

      const result = await actionToolRegistry.execute(pendingStep.executionAction, {
        device: backend,
        confirmSensitiveAction,
      })
      recordAgentStep(ensureSession(), pendingStep, result.summary, result.success)
      addLog({
        tone: result.success ? 'ok' : 'error',
        title: result.success ? `Executed ${pendingStep.preview}` : `Failed ${pendingStep.preview}`,
        detail: result.summary,
        screenshot: toLogScreenshot(pendingStep.screenshot),
        timeline: buildStepTimeline(pendingStep, result.summary),
      })
      if (!result.success) {
        setError(result.summary)
      }
      await refreshDisplayedSnapshot()
      setPendingStep(null)
      syncConversation()
    })
  }

  async function runAutoLoop() {
    const controller = new AbortController()
    abortRef.current = controller
    const session = ensureSession()

    await runTask('Run agent', async () => {
      const runner = createAgentRunner({ device: backend, client, toolRegistry: actionToolRegistry })
      const result = await runner.run({
        modelConfig: { ...modelConfig, stream: streamResponses },
        task: session.task,
        autoExecute: true,
        maxSteps,
        session,
        signal: controller.signal,
        confirmSensitiveAction,
        onSnapshot: applyDeviceSnapshot,
        onStep: (step) => {
          setScreenshot(step.screenshot)
          setCurrentApp(step.currentApp)
          setDeviceState(step.deviceState)
          setPendingStep(step.action.action === 'done' ? null : step)
          addLog({
            tone: 'info',
            title: `Step ${step.index}: ${step.preview}`,
            detail: formatStepDetail(step),
            screenshot: toLogScreenshot(step.screenshot),
            timeline: buildStepTimeline(step),
          })
          syncConversation()
        },
        onExecuted: async (step, commandResult) => {
          addLog({
            tone: 'ok',
            title: `Executed ${step.preview}`,
            detail: commandResult,
            screenshot: toLogScreenshot(step.screenshot),
            timeline: buildStepTimeline(step, commandResult),
          })
          await refreshDisplayedSnapshot()
          syncConversation()
        },
      })

      if (result.status === 'done') {
        addLog({ tone: 'ok', title: 'Task complete' })
      }
      if (result.status === 'max_steps') {
        addLog({ tone: 'warn', title: 'Max steps reached', detail: `${maxSteps} steps` })
      }
      if (result.status === 'stopped') {
        addLog({ tone: 'warn', title: 'Run stopped' })
      }
      if (result.status === 'awaiting_takeover') {
        addLog({ tone: 'warn', title: 'Manual takeover requested' })
      }
      if (result.status === 'loop_guard') {
        addLog({ tone: 'warn', title: 'Loop guard stopped the run', detail: result.reason })
      }
      if (result.status !== 'awaiting_takeover') {
        setPendingStep(null)
      }
      syncConversation()
    })
  }

  async function submitChatMessage() {
    const message = chatInput.trim()
    if (!message) {
      return
    }

    setChatInput('')
    const session = ensureSession()

    if (busy) {
      queueUserMessage(session, message)
      syncConversation()
      addLog({ tone: 'info', title: 'User message queued', detail: message })
      return
    }

    addUserMessage(session, message)
    syncConversation()
    addLog({ tone: 'info', title: 'User message', detail: message })

    if (!connected || !hasModelConfig) {
      return
    }

    if (autoExecute) {
      await runAutoLoop()
    } else {
      await planNextStep()
    }
  }

  function stopRun() {
    abortRef.current?.abort()
    addLog({ tone: 'warn', title: 'Stop requested' })
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <img
            alt="WebDroid Agent logo"
            className="app-logo"
            src="/webdroid-agent-logo.png"
          />
          <h1>WebDroid Agent</h1>
        </div>
        <div className="topbar-actions">
          <div className="status-strip">
            <span className={isWebUsbSupported() ? 'status ok' : 'status warn'}>
              <Usb size={16} />
              WebUSB {isWebUsbSupported() ? copy.webUsbReady : copy.webUsbMissing}
            </span>
            <span className="status">
              <ScanEye size={16} />
              {copy.currentApp}: {currentApp}
            </span>
          </div>
          <button type="button" className="settings-button" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon size={16} />
            {copy.settings}
          </button>
        </div>
      </header>

      {settingsOpen ? (
        <SettingsDialog
          copy={copy}
          languageMode={languageMode}
          onClose={() => setSettingsOpen(false)}
          onLanguageModeChange={setLanguageMode}
          onThemeModeChange={setThemeMode}
          repositoryStats={repositoryStats}
          repositoryStatsStatus={repositoryStatsStatus}
          themeMode={themeMode}
        />
      ) : null}

      {error ? (
        <div className="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="workspace">
        <aside className="panel config-panel">
          <ModelPanel
            copy={copy}
            modelConfig={modelConfig}
            onModelConfigChange={updateConfig}
            onStreamResponsesChange={setStreamResponses}
            streamResponses={streamResponses}
          />

          <DevicePanel
            actionSettleMs={actionSettleMs}
            busy={busy}
            connected={connected}
            copy={copy}
            currentApp={currentApp}
            deviceInfo={deviceInfo}
            doctorResults={doctorResults}
            deviceState={deviceState}
            doubleTapIntervalMs={doubleTapIntervalMs}
            installedApps={installedApps}
            keyboardStepMs={keyboardStepMs}
            onActionSettleMsChange={setActionSettleMs}
            onCaptureScreen={captureScreen}
            onConfirmSensitiveActionsChange={setConfirmSensitiveActions}
            onConnectDevice={connectDevice}
            onDisconnectDevice={disconnectDevice}
            onDoubleTapIntervalMsChange={setDoubleTapIntervalMs}
            onEnableAdbKeyboard={enableAdbKeyboard}
            onInstallAdbKeyboard={installAdbKeyboard}
            onKeyboardStepMsChange={setKeyboardStepMs}
            onLaunchInstalledApp={launchInstalledApp}
            onPreferAdbKeyboardChange={toggleAdbKeyboard}
            onRunDirectAction={runDirectAction}
            onRunDoctor={runDoctor}
            preferAdbKeyboard={preferAdbKeyboard}
            confirmSensitiveActions={confirmSensitiveActions}
          />
        </aside>

        <PhoneStage
          copy={copy}
          displayedScreenshot={displayedScreenshot}
          onRunInteractiveAction={runDirectAction}
          pendingStep={pendingStep}
        />

        <aside className="panel run-panel">
          <RunPanel
            autoExecute={autoExecute}
            busy={busy}
            canRun={canRun}
            chatInput={chatInput}
            conversation={conversation}
            copy={copy}
            logsCount={logs.length}
            maxSteps={maxSteps}
            onAutoExecuteChange={setAutoExecute}
            onChatInputChange={setChatInput}
            onExecutePendingStep={executePendingStep}
            onExportRunLog={exportRunLog}
            onMaxStepsChange={setMaxSteps}
            onPlanNextStep={planNextStep}
            onResetSession={resetSession}
            onRunAutoLoop={runAutoLoop}
            onStartNewChat={startNewChat}
            onStopRun={stopRun}
            onSubmitChatMessage={submitChatMessage}
            onTaskTemplateSelect={applyTaskTemplate}
            pendingStep={pendingStep}
            taskTemplates={taskTemplates}
          />
        </aside>
      </section>

      <RunLog
        logs={logs}
        onClear={clearRunLog}
        labels={{
          clear: copy.clear,
          empty: copy.noEvents,
          title: copy.runLog,
          closeScreenshotPreview: copy.closeScreenshotPreview,
          openScreenshotFor: copy.openScreenshotFor,
          screenshotDialogFor: copy.screenshotDialogFor,
          screenshotFor: (title) => `${copy.androidScreenshot}: ${title}`,
          expandedScreenshotFor: (title) => `${copy.expandedAndroidScreenshot}: ${title}`,
        }}
      />
    </main>
  )
}

function formatDeviceState(state: DeviceState) {
  return [
    `Current app: ${state.app}`,
    state.packageName ? `Package: ${state.packageName}` : null,
    state.activity ? `Activity: ${state.activity}` : null,
    state.orientation ? `Orientation: ${state.orientation}` : null,
    state.keyboard ? `Keyboard: ${state.keyboard}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export default App
