import { Play, Search } from 'lucide-react'
import { useState } from 'react'
import {
  getInstalledAppDisplayName,
  getInstalledAppSearchValues,
} from '../adapters/installedApps'
import type { InstalledApp } from '../adapters/deviceTypes'
import type { AppCopy } from '../lib/appCopy'
import type { BusyTask } from '../lib/busyTask'

export type InstalledAppsSectionProps = {
  busyTask: BusyTask | null
  connected: boolean
  copy: AppCopy
  installedApps: InstalledApp[]
  onLaunchInstalledApp: (app: InstalledApp) => void
}

export function InstalledAppsSection({
  busyTask,
  connected,
  copy,
  installedApps,
  onLaunchInstalledApp,
}: InstalledAppsSectionProps) {
  const [appSearch, setAppSearch] = useState('')

  const isBusy = Boolean(busyTask)
  const directDisabled = isBusy || !connected
  const normalizedAppSearch = appSearch.trim().toLowerCase()
  const visibleApps = installedApps.filter((app) => {
    if (!normalizedAppSearch) {
      return true
    }

    return getInstalledAppSearchValues(app).some((value) =>
      value.toLowerCase().includes(normalizedAppSearch),
    )
  })

  return (
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
              const appName = getInstalledAppDisplayName(app)
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
  )
}
