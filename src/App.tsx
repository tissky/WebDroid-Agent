import {
  Activity,
  AlertTriangle,
  Check,
  CircleStop,
  KeyRound,
  Link,
  Loader2,
  Play,
  RotateCcw,
  ScanEye,
  StepForward,
  Usb,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { DeviceInfo, DeviceScreenshot } from './adapters/deviceBackend'
import { WebAdbDeviceBackend, isWebUsbSupported } from './adapters/webAdbBackend'
import type { AgentAction } from './lib/actions'
import { buildActionPreview } from './lib/actions'
import { createAgentRunner, runAgentStep, type AgentStep } from './lib/agent'
import { createOpenAiClient, type ModelConfig } from './lib/openAiClient'
import { loadSettings, saveSettings } from './lib/settings'

type LogEntry = {
  id: number
  time: string
  tone: 'info' | 'ok' | 'warn' | 'error'
  title: string
  detail?: string
}

function App() {
  const abortRef = useRef<AbortController | null>(null)
  const settings = useMemo(() => loadSettings(), [])
  const [backend] = useState(() => new WebAdbDeviceBackend())
  const client = useMemo(() => createOpenAiClient(), [])
  const [modelConfig, setModelConfig] = useState<ModelConfig>(settings.modelConfig)
  const [task, setTask] = useState(settings.task)
  const [maxSteps, setMaxSteps] = useState(settings.maxSteps)
  const [autoExecute, setAutoExecute] = useState(settings.autoExecute)
  const [preferAdbKeyboard, setPreferAdbKeyboard] = useState(settings.preferAdbKeyboard)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [screenshot, setScreenshot] = useState<DeviceScreenshot | null>(null)
  const [pendingStep, setPendingStep] = useState<AgentStep | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connected = deviceInfo !== null
  const canRun = connected && !busy && Boolean(modelConfig.baseUrl && modelConfig.apiKey && modelConfig.model && task)
  const pendingButtonLabel =
    pendingStep?.action.action === 'take_over'
      ? 'Acknowledge'
      : pendingStep?.action.action === 'note'
        ? 'Acknowledge'
        : pendingStep?.action.action === 'done'
          ? 'Finish'
          : 'Execute'

  useEffect(() => {
    saveSettings({
      modelConfig,
      task,
      maxSteps,
      autoExecute,
      preferAdbKeyboard,
    })
  }, [autoExecute, maxSteps, modelConfig, preferAdbKeyboard, task])

  useEffect(() => {
    backend.setPreferAdbKeyboard(preferAdbKeyboard)
  }, [backend, preferAdbKeyboard])

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
    })
  }

  async function disconnectDevice() {
    await runTask('Disconnect device', async () => {
      await backend.disconnect()
      setDeviceInfo(null)
      setScreenshot(null)
      setPendingStep(null)
      addLog({ tone: 'info', title: 'Device disconnected' })
    })
  }

  async function captureScreen() {
    await runTask('Capture screen', async () => {
      const nextScreenshot = await backend.screenshot()
      setScreenshot(nextScreenshot)
      addLog({
        tone: 'ok',
        title: 'Screen captured',
        detail: `${nextScreenshot.screen.width}x${nextScreenshot.screen.height}`,
      })
    })
  }

  async function enableAdbKeyboard() {
    await runTask('Enable ADB Keyboard', async () => {
      const result = await backend.enableAdbKeyboard()
      setPreferAdbKeyboard(true)
      addLog({ tone: 'ok', title: 'ADB Keyboard enabled', detail: result })
    })
  }

  function toggleAdbKeyboard(value: boolean) {
    setPreferAdbKeyboard(value)
    backend.setPreferAdbKeyboard(value)
  }

  async function planNextStep() {
    await runTask('Plan next action', async () => {
      const step = await runAgentStep({
        device: backend,
        client,
        modelConfig,
        task,
        index: logs.length + 1,
      })
      setScreenshot(step.screenshot)
      setPendingStep(step)
      addLog({ tone: 'info', title: `Step ${step.index}: ${step.preview}`, detail: step.modelOutput })
    })
  }

  async function executePendingStep() {
    if (!pendingStep) {
      return
    }

    await runTask('Execute action', async () => {
      if (pendingStep.action.action === 'done') {
        addLog({ tone: 'ok', title: 'Task complete', detail: pendingStep.action.summary })
        setPendingStep(null)
        return
      }

      const result = await backend.execute(pendingStep.action)
      addLog({ tone: 'ok', title: `Executed ${pendingStep.preview}`, detail: result })
      setPendingStep(null)
    })
  }

  async function runAutoLoop() {
    const controller = new AbortController()
    abortRef.current = controller

    await runTask('Run agent', async () => {
      const runner = createAgentRunner({ device: backend, client })
      const result = await runner.run({
        modelConfig,
        task,
        autoExecute: true,
        maxSteps,
        signal: controller.signal,
        onStep: (step) => {
          setScreenshot(step.screenshot)
          setPendingStep(step.action.action === 'done' ? null : step)
          addLog({ tone: 'info', title: `Step ${step.index}: ${step.preview}`, detail: step.modelOutput })
        },
        onExecuted: (step, commandResult) => {
          addLog({ tone: 'ok', title: `Executed ${step.preview}`, detail: commandResult })
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
      if (result.status !== 'awaiting_takeover') {
        setPendingStep(null)
      }
    })
  }

  function stopRun() {
    abortRef.current?.abort()
    addLog({ tone: 'warn', title: 'Stop requested' })
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WebADB + OpenAI-compatible Phone Agent</p>
          <h1>Android Agent Console</h1>
        </div>
        <div className="status-strip">
          <span className={isWebUsbSupported() ? 'status ok' : 'status warn'}>
            <Usb size={16} />
            WebUSB {isWebUsbSupported() ? 'ready' : 'missing'}
          </span>
          <span className={connected ? 'status ok' : 'status'}>
            <Activity size={16} />
            {connected ? 'connected' : 'idle'}
          </span>
        </div>
      </header>

      {error ? (
        <div className="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="workspace">
        <aside className="panel config-panel">
          <div className="panel-title">
            <KeyRound size={18} />
            <h2>Model</h2>
          </div>
          <label>
            Base URL
            <input
              value={modelConfig.baseUrl}
              onChange={(event) => updateConfig('baseUrl', event.target.value)}
              placeholder="https://api.example.com/v1"
            />
          </label>
          <label>
            API Key
            <input
              value={modelConfig.apiKey}
              onChange={(event) => updateConfig('apiKey', event.target.value)}
              placeholder="sk-..."
              type="password"
            />
          </label>
          <label>
            Model
            <input
              value={modelConfig.model}
              onChange={(event) => updateConfig('model', event.target.value)}
              placeholder="vision-model"
            />
          </label>

          <div className="panel-title">
            <Usb size={18} />
            <h2>Device</h2>
          </div>
          <div className="device-box">
            <span>{deviceInfo?.name || 'No device'}</span>
            <small>{deviceInfo?.serial || 'USB debugging required'}</small>
          </div>
          <div className="button-row">
            <button type="button" onClick={connectDevice} disabled={Boolean(busy) || connected}>
              <Link size={16} />
              Connect
            </button>
            <button type="button" onClick={disconnectDevice} disabled={Boolean(busy) || !connected}>
              <CircleStop size={16} />
              Disconnect
            </button>
          </div>
          <button type="button" className="wide" onClick={captureScreen} disabled={Boolean(busy) || !connected}>
            <ScanEye size={16} />
            Capture
          </button>
          <button
            type="button"
            className="wide"
            onClick={enableAdbKeyboard}
            disabled={Boolean(busy) || !connected}
          >
            <KeyRound size={16} />
            Enable ADB Keyboard
          </button>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferAdbKeyboard}
              onChange={(event) => toggleAdbKeyboard(event.target.checked)}
            />
            <span>Use ADB Keyboard for text</span>
          </label>
          <div className="capability-grid" aria-label="Supported actions">
            {[
              'Launch',
              'Tap',
              'Type',
              'Swipe',
              'Back',
              'Home',
              'Long press',
              'Double tap',
              'Wait',
              'Take over',
            ].map((capability) => (
              <span key={capability}>{capability}</span>
            ))}
          </div>
        </aside>

        <section className="phone-stage">
          <div className="phone-frame">
            {screenshot ? (
              <>
                <img src={screenshot.dataUrl} alt="Android screenshot" />
                {pendingStep ? <ActionOverlay action={pendingStep.action} screen={screenshot.screen} /> : null}
              </>
            ) : (
              <div className="empty-screen">
                <ScanEye size={36} />
                <span>No screenshot</span>
              </div>
            )}
          </div>
        </section>

        <aside className="panel run-panel">
          <div className="panel-title">
            <Play size={18} />
            <h2>Task</h2>
          </div>
          <label>
            Goal
            <textarea value={task} onChange={(event) => setTask(event.target.value)} rows={5} />
          </label>
          <label>
            Max steps
            <input
              type="number"
              min={1}
              max={30}
              value={maxSteps}
              onChange={(event) => setMaxSteps(Number(event.target.value))}
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoExecute}
              onChange={(event) => setAutoExecute(event.target.checked)}
            />
            <span>Auto execute</span>
          </label>
          <div className="button-row">
            <button type="button" onClick={planNextStep} disabled={!canRun || autoExecute}>
              <StepForward size={16} />
              Plan
            </button>
            <button type="button" onClick={runAutoLoop} disabled={!canRun || !autoExecute}>
              {busy === 'Run agent' ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
              Run
            </button>
          </div>
          <button type="button" className="wide danger" onClick={stopRun} disabled={!busy}>
            <CircleStop size={16} />
            Stop
          </button>

          <div className="pending-action">
            <div className="pending-header">
              <span>Pending action</span>
              {pendingStep ? <small>Step {pendingStep.index}</small> : null}
            </div>
            <p>{pendingStep ? buildActionPreview(pendingStep.action) : 'None'}</p>
            <button type="button" className="wide primary" onClick={executePendingStep} disabled={!pendingStep || Boolean(busy)}>
              <Check size={16} />
              {pendingButtonLabel}
            </button>
          </div>
        </aside>
      </section>

      <section className="log-section">
        <div className="panel-title">
          <RotateCcw size={18} />
          <h2>Run Log</h2>
        </div>
        <div className="log-list">
          {logs.length === 0 ? <p className="muted">No events yet</p> : null}
          {logs.map((entry) => (
            <article className={`log-entry ${entry.tone}`} key={entry.id}>
              <time>{entry.time}</time>
              <strong>{entry.title}</strong>
              {entry.detail ? <pre>{entry.detail}</pre> : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function ActionOverlay({ action, screen }: { action: AgentAction; screen: { width: number; height: number } }) {
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

export default App
