import { AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { WebAdbDeviceBackend } from './adapters/webAdbBackend'
import type { AgentStep } from './lib/agent'
import { createOpenAiClient } from './lib/openAiClient'
import type { ModelConfig } from './lib/openAiTypes'
import { APP_COPY, resolveLocale } from './lib/appCopy'
import {
  createDefaultAppCards,
  loadAppCards,
  parseAppCardsJson,
  saveAppCards,
  serializeAppCards,
} from './lib/appCards'
import type { ActionProtocol } from './lib/actionProtocol'
import {
  loadCustomToolDefinitions,
  loadSecretRecords,
  parseCustomToolDefinitionsJson,
  parseSecretRecordsJson,
  saveCustomToolDefinitions,
  saveSecretRecords,
  serializeCustomToolDefinitions,
  serializeSecretRecords,
} from './lib/agentResources'
import { useAgentRunController } from './hooks/useAgentRunController'
import { useConfigTargetScroll } from './hooks/useConfigTargetScroll'
import { useDeviceController } from './hooks/useDeviceController'
import { useAgentSessionHistory } from './hooks/useAgentSessionHistory'
import { useBusyTask } from './hooks/useBusyTask'
import { useDocumentPreferences } from './hooks/useDocumentPreferences'
import { usePersistedSettings } from './hooks/usePersistedSettings'
import { useRepositoryStats } from './hooks/useRepositoryStats'
import { useRunLog } from './hooks/useRunLog'
import { useStorageEstimate } from './hooks/useStorageEstimate'
import { OPENAI_PROXY_URL } from './lib/openAiRuntimeConfig'
import { loadSettings, type AppSettings } from './lib/settings'
import { createDefaultActionToolRegistry } from './lib/toolRegistry'
import { AppTopbar } from './components/AppTopbar'
import { ConfigSidebar } from './components/ConfigSidebar'
import { PhoneStage } from './components/PhoneStage'
import { RunLog } from './components/RunLog'
import { ConversationPanel } from './components/ConversationPanel'
import { SettingsDialog } from './components/SettingsDialog'
import { TutorialPanel } from './components/TutorialPanel'

function App() {
  const settings = useMemo(() => loadSettings(), [])
  const [backend] = useState(() => new WebAdbDeviceBackend())
  const client = useMemo(
    () => createOpenAiClient(globalThis.fetch, { proxyUrl: OPENAI_PROXY_URL }),
    [],
  )
  const actionToolRegistry = useMemo(() => createDefaultActionToolRegistry(), [])
  const [actionProtocol, setActionProtocol] = useState<ActionProtocol>(settings.actionProtocol)
  const [appCards, setAppCards] = useState(() => loadAppCards())
  const [appCardsJson, setAppCardsJson] = useState(() => serializeAppCards(appCards))
  const [appCardsJsonError, setAppCardsJsonError] = useState<string | null>(null)
  const [secretRecords, setSecretRecords] = useState(() => loadSecretRecords())
  const [secretRecordsJson, setSecretRecordsJson] = useState(() =>
    serializeSecretRecords(secretRecords),
  )
  const [secretRecordsJsonError, setSecretRecordsJsonError] = useState<string | null>(null)
  const [customTools, setCustomTools] = useState(() => loadCustomToolDefinitions())
  const [customToolsJson, setCustomToolsJson] = useState(() =>
    serializeCustomToolDefinitions(customTools),
  )
  const [customToolsJsonError, setCustomToolsJsonError] = useState<string | null>(null)
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false)
  const [modelConfig, setModelConfig] = useState<ModelConfig>(settings.modelConfig)
  const [chatInput, setChatInput] = useState('')
  const [maxSteps, setMaxSteps] = useState(settings.maxSteps)
  const [screenBlackoutDuringAutoControl, setScreenBlackoutDuringAutoControl] = useState(
    settings.screenBlackoutDuringAutoControl,
  )
  const [streamResponses, setStreamResponses] = useState(settings.streamResponses)
  const [themeMode, setThemeMode] = useState(settings.themeMode)
  const [languageMode, setLanguageMode] = useState(settings.languageMode)
  const [configSidebarOpen, setConfigSidebarOpen] = useState(true)
  const openConfigTarget = useConfigTargetScroll(configSidebarOpen, setConfigSidebarOpen)
  const [pendingStep, setPendingStep] = useState<AgentStep | null>(null)
  const { logs, addLog, clearLogs } = useRunLog()
  const { busyTask, error, runTask, setError } = useBusyTask(({ label, message }) => {
    addLog({ tone: 'error', title: label, detail: message })
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const { repositoryStats, repositoryStatsStatus } = useRepositoryStats(settingsOpen)
  const { storageEstimate, storageEstimateStatus } = useStorageEstimate(settingsOpen)

  const activeLocale = useMemo(() => resolveLocale(languageMode), [languageMode])
  const copy = APP_COPY[activeLocale]
  const resetPendingStep = useCallback(() => setPendingStep(null), [])
  const device = useDeviceController({
    addLog,
    backend,
    busyTask,
    copy,
    initialSettings: settings,
    modelConfig,
    onPendingStepReset: resetPendingStep,
    runTask,
  })
  const {
    actionSettleMs,
    confirmSensitiveActions,
    doubleTapIntervalMs,
    keyboardStepMs,
    preferAdbKeyboard,
    unrestrictedMode,
  } = device.options
  const hasModelConfig = Boolean(modelConfig.baseUrl && modelConfig.apiKey && modelConfig.model)
  const currentSettings = useMemo<AppSettings>(
    () => ({
      actionProtocol,
      modelConfig,
      maxSteps,
      preferAdbKeyboard,
      confirmSensitiveActions,
      unrestrictedMode,
      screenBlackoutDuringAutoControl,
      streamResponses,
      actionSettleMs,
      doubleTapIntervalMs,
      keyboardStepMs,
      themeMode,
      languageMode,
    }),
    [
      actionProtocol,
      actionSettleMs,
      confirmSensitiveActions,
      doubleTapIntervalMs,
      keyboardStepMs,
      languageMode,
      maxSteps,
      modelConfig,
      preferAdbKeyboard,
      screenBlackoutDuringAutoControl,
      streamResponses,
      themeMode,
      unrestrictedMode,
    ],
  )
  useDocumentPreferences(themeMode, activeLocale)
  usePersistedSettings(currentSettings)
  useEffect(() => saveAppCards(appCards), [appCards])
  useEffect(() => saveSecretRecords(secretRecords), [secretRecords])
  useEffect(() => saveCustomToolDefinitions(customTools), [customTools])

  const {
    activeThreadId,
    clearHistoryThreads,
    conversation,
    deleteHistoryThread: deleteStoredHistoryThread,
    ensureSession,
    interactionItems,
    selectHistoryThread: selectStoredHistoryThread,
    startNewSession,
    syncConversation,
    threadSummaries,
  } = useAgentSessionHistory({
    addLog,
    copy,
    currentSettings,
    initialSettings: settings,
    onSessionStateChange: device.applySessionDeviceState,
  })
  const { executePendingStep, stopCurrentRun, submitChatMessage } = useAgentRunController({
    actionToolRegistry,
    actionProtocol,
    addLog,
    appCards,
    backend,
    busyTask,
    canRunAgent: device.connected && hasModelConfig,
    chatInput,
    client,
    copy,
    customTools,
    device,
    ensureSession,
    maxSteps,
    modelConfig,
    pendingStep,
    runTask,
    setChatInput,
    setError,
    setPendingStep,
    secrets: secretRecords,
    screenBlackoutDuringAutoControl,
    streamResponses,
    syncConversation,
    unrestrictedMode,
  })

  function updateConfig<Key extends keyof ModelConfig>(key: Key, value: ModelConfig[Key]) {
    setModelConfig((current) => {
      return { ...current, [key]: value }
    })
  }

  function updateAppCardsJson(value: string) {
    setAppCardsJson(value)
    try {
      const nextAppCards = parseAppCardsJson(value)
      setAppCards(nextAppCards)
      setAppCardsJsonError(null)
    } catch (caught) {
      setAppCardsJsonError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  function resetAppCards() {
    const nextAppCards = createDefaultAppCards()
    setAppCards(nextAppCards)
    setAppCardsJson(serializeAppCards(nextAppCards))
    setAppCardsJsonError(null)
  }

  function updateSecretRecordsJson(value: string) {
    setSecretRecordsJson(value)
    try {
      const nextSecrets = parseSecretRecordsJson(value)
      setSecretRecords(nextSecrets)
      setSecretRecordsJsonError(null)
    } catch (caught) {
      setSecretRecordsJsonError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  function updateCustomToolsJson(value: string) {
    setCustomToolsJson(value)
    try {
      const nextTools = parseCustomToolDefinitionsJson(value)
      setCustomTools(nextTools)
      setCustomToolsJsonError(null)
    } catch (caught) {
      setCustomToolsJsonError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  function startNewChat() {
    setChatInput('')
    setPendingStep(null)
    setHistorySidebarOpen(false)
    startNewSession()
    addLog({ tone: 'info', title: copy.newChatStarted })
  }

  async function clearChatHistoryFromSettings() {
    const cleared = await clearHistoryThreads()
    if (cleared) {
      setChatInput('')
      setPendingStep(null)
      setHistorySidebarOpen(false)
    }
  }

  async function selectHistoryThread(threadId: string) {
    if (busyTask) {
      return
    }

    const restored = await selectStoredHistoryThread(threadId)
    if (restored) {
      setChatInput('')
      setPendingStep(null)
      setHistorySidebarOpen(false)
    }
  }

  async function deleteHistoryThread(threadId: string) {
    if (busyTask) {
      return
    }

    const result = await deleteStoredHistoryThread(threadId)
    if (result.resetActiveThread) {
      setChatInput('')
      setPendingStep(null)
    }
  }

  function openSettings() {
    setTutorialOpen(false)
    setSettingsOpen(true)
  }

  function toggleTutorial() {
    setSettingsOpen(false)
    setTutorialOpen((current) => !current)
  }

  return (
    <main className="app-shell">
      <AppTopbar
        copy={copy}
        currentApp={device.currentApp}
        isTutorialOpen={tutorialOpen}
        onOpenSettings={openSettings}
        onToggleTutorial={toggleTutorial}
      />

      {settingsOpen ? (
        <SettingsDialog
          copy={copy}
          appCardsJson={appCardsJson}
          appCardsJsonError={appCardsJsonError}
          customToolsJson={customToolsJson}
          customToolsJsonError={customToolsJsonError}
          languageMode={languageMode}
          maxSteps={maxSteps}
          screenBlackoutDuringAutoControl={screenBlackoutDuringAutoControl}
          onAppCardsJsonChange={updateAppCardsJson}
          onScreenBlackoutDuringAutoControlChange={setScreenBlackoutDuringAutoControl}
          onCustomToolsJsonChange={updateCustomToolsJson}
          onClearChatHistory={() => {
            void clearChatHistoryFromSettings()
          }}
          onClearRunLog={clearLogs}
          onClose={() => setSettingsOpen(false)}
          onLanguageModeChange={setLanguageMode}
          onMaxStepsChange={setMaxSteps}
          onResetAppCards={resetAppCards}
          onSecretRecordsJsonChange={updateSecretRecordsJson}
          onThemeModeChange={setThemeMode}
          repositoryStats={repositoryStats}
          repositoryStatsStatus={repositoryStatsStatus}
          storageEstimate={storageEstimate}
          storageEstimateStatus={storageEstimateStatus}
          secretRecordsJson={secretRecordsJson}
          secretRecordsJsonError={secretRecordsJsonError}
          themeMode={themeMode}
        />
      ) : null}

      {tutorialOpen ? (
        <TutorialPanel copy={copy} onClose={() => setTutorialOpen(false)} />
      ) : null}

      {error ? (
        <div className="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <section
        className={
          configSidebarOpen ? 'workspace' : 'workspace workspace-config-collapsed'
        }
      >
        <ConfigSidebar
          copy={copy}
          devicePanelActions={device.actions}
          devicePanelOptions={device.options}
          devicePanelState={device.state}
          isOpen={configSidebarOpen}
          modelConfig={modelConfig}
          actionProtocol={actionProtocol}
          onModelConfigChange={updateConfig}
          onActionProtocolChange={setActionProtocol}
          onSelectTarget={openConfigTarget}
          onStreamResponsesChange={setStreamResponses}
          onToggleOpen={() => setConfigSidebarOpen((current) => !current)}
          streamResponses={streamResponses}
        />

        <PhoneStage
          copy={copy}
          displayedScreenshot={device.displayedScreenshot}
          onRunInteractiveAction={device.runScreenshotAction}
          pendingStep={pendingStep}
        />

        <ConversationPanel
          activeThreadId={activeThreadId}
          busyTask={busyTask}
          chatInput={chatInput}
          conversation={conversation}
          interactionItems={interactionItems}
          copy={copy}
          historySidebarOpen={historySidebarOpen}
          onChatInputChange={setChatInput}
          onCloseHistorySidebar={() => setHistorySidebarOpen(false)}
          onDeleteThread={(threadId) => {
            void deleteHistoryThread(threadId)
          }}
          onExecutePendingStep={executePendingStep}
          onSelectThread={(threadId) => {
            void selectHistoryThread(threadId)
          }}
          onStartNewChat={startNewChat}
          onStopRun={stopCurrentRun}
          onSubmitChatMessage={submitChatMessage}
          onToggleHistorySidebar={() => setHistorySidebarOpen((current) => !current)}
          pendingStep={pendingStep}
          threadSummaries={threadSummaries}
        />
      </section>

      <details className="log-drawer compact-section">
        <summary>
          <span>{copy.runLog}</span>
          <small>{logs[0]?.title ?? copy.noEvents}</small>
        </summary>
        <RunLog
          logs={logs}
          onClear={clearLogs}
          labels={{
            clear: copy.clear,
            closeScreenshotPreview: copy.closeScreenshotPreview,
            empty: copy.noEvents,
            executionResult: copy.stepExecutionResult,
            expandedScreenshotFor: (title) => `${copy.expandedAndroidScreenshot}: ${title}`,
            modelOutput: copy.stepModelOutput,
            openScreenshotFor: copy.openScreenshotFor,
            parsedAction: copy.stepParsedAction,
            screenshotDialogFor: copy.screenshotDialogFor,
            screenshotFor: (title) => `${copy.androidScreenshot}: ${title}`,
            step: (step) => `${copy.step} ${step}`,
            title: copy.runLog,
          }}
        />
      </details>
    </main>
  )
}

export default App
