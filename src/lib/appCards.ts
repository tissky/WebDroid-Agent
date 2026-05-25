export type AppCard = {
  packageName: string
  title: string
  content: string
}

export type AppCardMap = Record<string, AppCard>

export type AppCardStorage = Pick<Storage, 'getItem' | 'setItem'>

const APP_CARDS_KEY = 'webdroid-agent-app-cards'

export const BUILT_IN_APP_CARDS: AppCardMap = {
  'com.android.chrome': {
    packageName: 'com.android.chrome',
    title: 'Chrome',
    content: [
      '# Chrome App Card',
      '- The address bar is at the top; tap it to enter URLs or search queries.',
      '- The tab switcher and overflow menu are usually near the top-right.',
      '- For searches, type directly into the address bar and press Enter.',
      '- Wait for page loading indicators to settle before verifying page content.',
    ].join('\n'),
  },
  'com.google.android.gm': {
    packageName: 'com.google.android.gm',
    title: 'Gmail',
    content: [
      '# Gmail App Card',
      '- The compose button is usually in the lower-right area.',
      '- Search supports terms like from:, to:, subject:, has:attachment, and newer_than:.',
      '- Open email threads by tapping the visible sender or subject row.',
      '- Stop before sending or deleting messages unless the user explicitly asked for it.',
    ].join('\n'),
  },
  'com.android.settings': {
    packageName: 'com.android.settings',
    title: 'Settings',
    content: [
      '# Settings App Card',
      '- Search is often the fastest path for deeply nested settings.',
      '- Network, Bluetooth, Display, Apps, and System sections may be visible on the main page.',
      '- Verify toggles by reading their final checked/on/off state before finishing.',
      '- Be careful with resets, permissions, accounts, passwords, and security changes.',
    ].join('\n'),
  },
}

export function createDefaultAppCards(): AppCardMap {
  return cloneAppCards(BUILT_IN_APP_CARDS)
}

export function loadAppCards(storage: AppCardStorage = localStorage) {
  const raw = storage.getItem(APP_CARDS_KEY)
  if (!raw) {
    return createDefaultAppCards()
  }

  try {
    return normalizeAppCards(JSON.parse(raw))
  } catch {
    return createDefaultAppCards()
  }
}

export function saveAppCards(appCards: AppCardMap, storage: AppCardStorage = localStorage) {
  storage.setItem(APP_CARDS_KEY, serializeAppCards(appCards))
}

export function serializeAppCards(appCards: AppCardMap) {
  return JSON.stringify(toEditableAppCardJson(appCards), null, 2)
}

export function parseAppCardsJson(raw: string) {
  return normalizeAppCards(JSON.parse(raw))
}

export function resolveAppCard(appCards: AppCardMap, packageName?: string) {
  if (!packageName) {
    return undefined
  }
  return appCards[packageName]?.content
}

function normalizeAppCards(value: unknown): AppCardMap {
  if (!isRecord(value)) {
    return createDefaultAppCards()
  }

  const appCards: AppCardMap = {}
  for (const [packageName, entry] of Object.entries(value)) {
    if (!isPackageName(packageName)) {
      continue
    }
    const normalized = normalizeAppCardEntry(packageName, entry)
    if (normalized) {
      appCards[packageName] = normalized
    }
  }

  return Object.keys(appCards).length > 0 ? appCards : createDefaultAppCards()
}

function normalizeAppCardEntry(packageName: string, value: unknown): AppCard | null {
  if (typeof value === 'string') {
    const content = value.trim()
    return content ? { packageName, title: packageName, content } : null
  }

  if (!isRecord(value)) {
    return null
  }

  const title = typeof value.title === 'string' && value.title.trim() ? value.title.trim() : packageName
  const content = typeof value.content === 'string' ? value.content.trim() : ''
  return content ? { packageName, title, content } : null
}

function toEditableAppCardJson(appCards: AppCardMap) {
  return Object.fromEntries(
    Object.values(appCards)
      .sort((left, right) => left.packageName.localeCompare(right.packageName))
      .map((appCard) => [
        appCard.packageName,
        {
          title: appCard.title,
          content: appCard.content,
        },
      ]),
  )
}

function cloneAppCards(appCards: AppCardMap): AppCardMap {
  return Object.fromEntries(
    Object.entries(appCards).map(([packageName, appCard]) => [
      packageName,
      { ...appCard },
    ]),
  )
}

function isPackageName(value: string) {
  return /^[A-Za-z0-9_.-]+$/.test(value) && value.includes('.')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
