import {
  resolveAppAliasesFromPackage,
  resolveAppNameFromPackage,
  resolveAppPackage,
} from './appPackages'
import type { InstalledApp } from './deviceTypes'

export function parseInstalledAppsFromPackageOutput(output: string): InstalledApp[] {
  const apps: InstalledApp[] = []
  let current: Partial<InstalledApp> = {}

  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    if (/^ResolveInfo\b/.test(line)) {
      pushInstalledApp(apps, current)
      current = {}
      continue
    }

    const component = parseComponentLine(line)
    if (component) {
      pushInstalledApp(apps, current)
      current = {}
      pushInstalledApp(apps, component)
      continue
    }

    const packageListMatch = line.match(/^package:([a-zA-Z][\w]*(?:\.[\w]+)+)$/)
    if (packageListMatch) {
      pushInstalledApp(apps, current)
      current = {}
      pushInstalledApp(apps, { packageName: packageListMatch[1] })
      continue
    }

    const packageMatch = line.match(/\bpackageName=([a-zA-Z][\w]*(?:\.[\w]+)+)\b/)
    if (packageMatch) {
      if (current.packageName) {
        pushInstalledApp(apps, current)
        current = {}
      }
      current.packageName = packageMatch[1]
      continue
    }

    const nameMatch = line.match(/\bname=([^\s]+)/)
    if (nameMatch) {
      current.activity = nameMatch[1]
      continue
    }

    const labelMatch = line.match(/\bnonLocalizedLabel=(.+)$/)
    if (labelMatch) {
      const label = cleanInstalledAppLabel(labelMatch[1])
      if (label) {
        current.label = label
      }
    }
  }

  pushInstalledApp(apps, current)
  return mergeInstalledApps(apps)
}

export function resolveInstalledAppPackage(
  app: string,
  installedApps: readonly InstalledApp[] = [],
): string | undefined {
  const requested = app.trim()
  if (!requested) {
    return undefined
  }

  const exactPackage = installedApps.find((candidate) => candidate.packageName === requested)
  if (exactPackage) {
    return exactPackage.packageName
  }

  const staticPackage = resolveAppPackage(requested)
  if (staticPackage && hasInstalledPackage(installedApps, staticPackage)) {
    return staticPackage
  }

  const requestedKey = normalizeAppToken(requested)
  const scored = installedApps
    .map((candidate, index) => ({
      candidate,
      score: scoreInstalledAppMatch(requestedKey, candidate),
      index,
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)

  return scored[0]?.candidate.packageName
}

export function getInstalledAppDisplayName(app: InstalledApp) {
  return (
    cleanInstalledAppLabel(app.label) ??
    resolveAppNameFromPackage(app.packageName) ??
    app.packageName
  )
}

export function getInstalledAppSearchValues(app: InstalledApp) {
  return [
    cleanInstalledAppLabel(app.label),
    ...resolveAppAliasesFromPackage(app.packageName),
    app.packageName,
    app.activity,
  ].filter((value): value is string => Boolean(value))
}

export function cleanInstalledAppLabel(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  const quotedMatch = trimmed.match(/^(['"])(.*?)\1(?:\s+\w+=|$)/)
  const labelWithMetadata = quotedMatch?.[2] ?? trimmed
  const metadataStart = labelWithMetadata.search(/\s+(?:banner|icon|labelRes|logo)=/)
  const label = stripQuotes(
    (metadataStart >= 0 ? labelWithMetadata.slice(0, metadataStart) : labelWithMetadata).trim(),
  )

  if (!label || label === 'null') {
    return undefined
  }

  return label
}

function pushInstalledApp(apps: InstalledApp[], app: Partial<InstalledApp>) {
  if (!app.packageName) {
    return
  }

  const label = cleanInstalledAppLabel(app.label)
  apps.push({
    packageName: app.packageName,
    ...(app.activity ? { activity: app.activity } : {}),
    ...(label ? { label } : {}),
  })
}

function mergeInstalledApps(apps: readonly InstalledApp[]) {
  const merged = new Map<string, InstalledApp>()
  for (const app of apps) {
    const existing = merged.get(app.packageName)
    merged.set(app.packageName, {
      packageName: app.packageName,
      activity: existing?.activity ?? app.activity,
      label: existing?.label ?? app.label,
    })
  }
  return [...merged.values()]
}

function parseComponentLine(line: string): InstalledApp | null {
  const match = line.match(/\b([a-zA-Z][\w]*(?:\.[\w]+)+)\/([^\s}]+)/)
  if (!match) {
    return null
  }

  return {
    packageName: match[1],
    activity: match[2],
  }
}

function hasInstalledPackage(installedApps: readonly InstalledApp[], packageName: string) {
  return installedApps.length === 0 || installedApps.some((app) => app.packageName === packageName)
}

function scoreInstalledAppMatch(query: string, app: InstalledApp) {
  const tokens = installedAppTokens(app)
  if (tokens.some((token) => token === query)) {
    return 100
  }
  if (tokens.some((token) => token.endsWith(query))) {
    return 75
  }
  if (query.length >= 3 && tokens.some((token) => token.includes(query))) {
    return 50
  }
  return 0
}

function installedAppTokens(app: InstalledApp) {
  const packageParts = app.packageName.split('.')
  return [
    ...getInstalledAppSearchValues(app),
    app.packageName,
    packageParts.at(-1),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeAppToken)
}

function normalizeAppToken(value: string) {
  return value.toLowerCase().replace(/[\s._-]+/g, '')
}

function stripQuotes(value: string) {
  return value.replace(/^['"]|['"]$/g, '')
}
