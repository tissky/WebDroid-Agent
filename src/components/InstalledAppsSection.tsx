import { Play, Search } from 'lucide-react'
import { useState } from 'react'
import {
  getInstalledAppDisplayName,
  getInstalledAppSearchValues,
} from '../adapters/installedApps'
import type { InstalledApp } from '../adapters/deviceTypes'
import type { AppCopy } from '../lib/appCopy'
import type { BusyTask } from '../lib/busyTask'
import { LazyDetails } from './LazyDetails'

export type InstalledAppsSectionProps = {
  busyTask: BusyTask | null
  connected: boolean
  copy: AppCopy
  installedApps: InstalledApp[]
  onLaunchInstalledApp: (app: InstalledApp) => void
  sectionId?: string
}

export function InstalledAppsSection({
  busyTask,
  connected,
  copy,
  installedApps,
  onLaunchInstalledApp,
  sectionId,
}: InstalledAppsSectionProps) {
  const [appSearch, setAppSearch] = useState('')

  const isBusy = Boolean(busyTask)
  const launchDisabled = isBusy || !connected
  const normalizedAppSearch = appSearch.trim().toLowerCase()

  return (
    <LazyDetails className="compact-section" id={sectionId} summary={copy.installedApps}>
      {() => {
        const visibleApps = filterInstalledApps(installedApps, normalizedAppSearch)
        return (
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
                    <article className="installed-app-row" key={app.packageName}>
                      <div>
                        <strong>{appName}</strong>
                        <small>{app.packageName}</small>
                      </div>
                      <button
                        type="button"
                        aria-label={copy.launchInstalledApp(appName)}
                        onClick={() => onLaunchInstalledApp(app)}
                        disabled={launchDisabled}
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
        )
      }}
    </LazyDetails>
  )
}

function filterInstalledApps(installedApps: InstalledApp[], normalizedSearch: string) {
  if (!normalizedSearch) {
    return installedApps
  }

  return installedApps.filter((app) =>
    getInstalledAppSearchValues(app).some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    ),
  )
}
