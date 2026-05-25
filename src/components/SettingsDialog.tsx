import {
  AlertTriangle,
  Code2,
  ExternalLink,
  FileJson,
  Gauge,
  GitFork,
  HardDrive,
  KeyRound,
  Languages,
  MessageSquareX,
  Monitor,
  MonitorOff,
  RotateCcw,
  ScrollText,
  Star,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import type { AppCopy } from '../lib/appCopy'
import { REPOSITORY_URL, type RepositoryStats } from '../lib/repository'
import type { LanguageMode, ThemeMode } from '../lib/settings'
import type { StorageEstimateStatus, StorageUsageEstimate } from '../hooks/useStorageEstimate'

export type SettingsDialogProps = {
  appCardsJson: string
  appCardsJsonError: string | null
  copy: AppCopy
  customToolsJson: string
  customToolsJsonError: string | null
  languageMode: LanguageMode
  maxSteps: number
  screenBlackoutDuringAutoControl: boolean
  onAppCardsJsonChange: (value: string) => void
  onScreenBlackoutDuringAutoControlChange: (value: boolean) => void
  onCustomToolsJsonChange: (value: string) => void
  onLanguageModeChange: (value: LanguageMode) => void
  onClearChatHistory: () => void
  onClearRunLog: () => void
  onClose: () => void
  onMaxStepsChange: (value: number) => void
  onResetAppCards: () => void
  onSecretRecordsJsonChange: (value: string) => void
  onThemeModeChange: (value: ThemeMode) => void
  repositoryStats: RepositoryStats | null
  repositoryStatsStatus: 'idle' | 'loading' | 'done' | 'error'
  storageEstimate: StorageUsageEstimate | null
  storageEstimateStatus: StorageEstimateStatus
  secretRecordsJson: string
  secretRecordsJsonError: string | null
  themeMode: ThemeMode
}

export function SettingsDialog({
  appCardsJson,
  appCardsJsonError,
  copy,
  customToolsJson,
  customToolsJsonError,
  languageMode,
  maxSteps,
  screenBlackoutDuringAutoControl,
  onAppCardsJsonChange,
  onScreenBlackoutDuringAutoControlChange,
  onCustomToolsJsonChange,
  onLanguageModeChange,
  onClearChatHistory,
  onClearRunLog,
  onClose,
  onMaxStepsChange,
  onResetAppCards,
  onSecretRecordsJsonChange,
  onThemeModeChange,
  repositoryStats,
  repositoryStatsStatus,
  storageEstimate,
  storageEstimateStatus,
  secretRecordsJson,
  secretRecordsJsonError,
  themeMode,
}: SettingsDialogProps) {
  return (
    <div
      className="settings-page"
      role="dialog"
      aria-modal="true"
      aria-label={copy.settings}
      onClick={onClose}
    >
      <section className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <p className="eyebrow">{copy.settings}</p>
            <h2>WebDroid Agent</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={copy.closeSettings}
            title={copy.closeSettings}
          >
            <X size={16} />
          </button>
        </div>
        <label className="settings-field">
          <span>
            <Languages size={16} />
            {copy.language}
          </span>
          <select
            value={languageMode}
            onChange={(event) => onLanguageModeChange(event.target.value as LanguageMode)}
          >
            <option value="system">{copy.languageSystem}</option>
            <option value="zh-CN">{copy.languageChinese}</option>
            <option value="en-US">{copy.languageEnglish}</option>
          </select>
        </label>
        <label className="settings-field">
          <span>
            <Monitor size={16} />
            {copy.theme}
          </span>
          <select
            value={themeMode}
            onChange={(event) => onThemeModeChange(event.target.value as ThemeMode)}
          >
            <option value="system">{copy.themeSystem}</option>
            <option value="light">{copy.themeLight}</option>
            <option value="dark">{copy.themeDark}</option>
          </select>
        </label>
        <label className="settings-field">
          <span>
            <Gauge size={16} />
            {copy.maxSteps}
          </span>
          <input
            type="number"
            min={1}
            max={200}
            value={maxSteps}
            onChange={(event) => onMaxStepsChange(Number(event.target.value))}
          />
        </label>
        <label
          className="settings-field settings-toggle-field"
          title={copy.screenBlackoutDuringAutoControlHelp}
        >
          <span>
            <MonitorOff size={16} />
            {copy.screenBlackoutDuringAutoControl}
          </span>
          <input
            type="checkbox"
            checked={screenBlackoutDuringAutoControl}
            onChange={(event) =>
              onScreenBlackoutDuringAutoControlChange(event.target.checked)
            }
          />
        </label>
        <section className="settings-storage" aria-label={copy.localCache}>
          <div>
            <span>
              <HardDrive size={16} />
              {copy.localCache}
            </span>
            <strong>{formatStorageStatus(storageEstimate, storageEstimateStatus, copy)}</strong>
          </div>
          {storageEstimateStatus === 'done' && storageEstimate?.quotaBytes ? (
            <meter
              aria-label={copy.localCacheUsage}
              min={0}
              max={storageEstimate.quotaBytes}
              value={storageEstimate.usageBytes}
            />
          ) : null}
        </section>
        <section className="settings-data-management" aria-label={copy.dataManagement}>
          <div className="settings-data-management-title">
            <Trash2 size={16} />
            <span>{copy.dataManagement}</span>
          </div>
          <div className="settings-data-actions">
            <button type="button" className="danger" onClick={onClearChatHistory}>
              <MessageSquareX size={16} />
              {copy.clearChatHistory}
            </button>
            <button type="button" onClick={onClearRunLog}>
              <ScrollText size={16} />
              {copy.clearRunLog}
            </button>
          </div>
        </section>
        <section className="settings-resource-management" aria-label={copy.appCards}>
          <div className="settings-resource-title">
            <FileJson size={16} />
            <span>{copy.appCards}</span>
            <button type="button" onClick={onResetAppCards}>
              <RotateCcw size={15} />
              {copy.resetAppCards}
            </button>
          </div>
          <textarea
            value={appCardsJson}
            onChange={(event) => onAppCardsJsonChange(event.target.value)}
            spellCheck={false}
            aria-label={copy.appCardsJson}
          />
          {appCardsJsonError ? <p className="settings-error">{appCardsJsonError}</p> : null}
        </section>
        <section className="settings-resource-management" aria-label={copy.secrets}>
          <div className="settings-resource-title">
            <KeyRound size={16} />
            <span>{copy.secrets}</span>
          </div>
          <textarea
            value={secretRecordsJson}
            onChange={(event) => onSecretRecordsJsonChange(event.target.value)}
            spellCheck={false}
            aria-label={copy.secretsJson}
          />
          {secretRecordsJsonError ? <p className="settings-error">{secretRecordsJsonError}</p> : null}
        </section>
        <section className="settings-resource-management" aria-label={copy.customTools}>
          <div className="settings-resource-title">
            <Wrench size={16} />
            <span>{copy.customTools}</span>
          </div>
          <textarea
            value={customToolsJson}
            onChange={(event) => onCustomToolsJsonChange(event.target.value)}
            spellCheck={false}
            aria-label={copy.customToolsJson}
          />
          {customToolsJsonError ? <p className="settings-error">{customToolsJsonError}</p> : null}
        </section>
        <p className="settings-copy">{copy.appDescription}</p>
        <a
          className="repository-link"
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={copy.githubRepository}
        >
          <Code2 size={18} />
          <span>{REPOSITORY_URL}</span>
          <ExternalLink size={15} />
        </a>
        <div className="repository-stats" aria-label={copy.repositoryStats}>
          <div>
            <Star size={18} />
            <strong>
              {repositoryStatsStatus === 'loading'
                ? '...'
                : (repositoryStats?.stars.toLocaleString() ?? '-')}
            </strong>
            <span>{copy.stars}</span>
          </div>
          <div>
            <GitFork size={18} />
            <strong>
              {repositoryStatsStatus === 'loading'
                ? '...'
                : (repositoryStats?.forks.toLocaleString() ?? '-')}
            </strong>
            <span>{copy.forks}</span>
          </div>
          <div>
            <AlertTriangle size={18} />
            <strong>
              {repositoryStatsStatus === 'loading'
                ? '...'
                : (repositoryStats?.openIssues.toLocaleString() ?? '-')}
            </strong>
            <span>{copy.openIssues}</span>
          </div>
        </div>
        {repositoryStatsStatus === 'error' ? (
          <p className="settings-error">{copy.githubStatsError}</p>
        ) : null}
      </section>
    </div>
  )
}

function formatStorageStatus(
  storageEstimate: StorageUsageEstimate | null,
  status: StorageEstimateStatus,
  copy: AppCopy,
) {
  if (status === 'loading' || status === 'idle') {
    return copy.localCacheLoading
  }
  if (status === 'unsupported') {
    return copy.localCacheUnavailable
  }
  if (status === 'error' || !storageEstimate) {
    return copy.localCacheError
  }

  const usage = formatBytes(storageEstimate.usageBytes)
  const quota = storageEstimate.quotaBytes ? formatBytes(storageEstimate.quotaBytes) : null
  return quota ? copy.localCacheUsageOf(usage, quota) : copy.localCacheUsageOnly(usage)
}

function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const
  let value = Math.max(0, bytes)
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const maximumFractionDigits = value >= 10 || unitIndex === 0 ? 0 : 1
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value)} ${
    units[unitIndex]
  }`
}
