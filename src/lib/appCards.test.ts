import { describe, expect, it, vi } from 'vitest'
import {
  createDefaultAppCards,
  loadAppCards,
  parseAppCardsJson,
  resolveAppCard,
  saveAppCards,
} from './appCards'

function memoryStorage(initial: Record<string, string> = {}) {
  const values = { ...initial }
  return {
    getItem: vi.fn((key: string) => values[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values[key] = value
    }),
  }
}

describe('app cards', () => {
  it('loads built-in cards by default', () => {
    const appCards = loadAppCards(memoryStorage())

    expect(resolveAppCard(appCards, 'com.android.chrome')).toContain('address bar')
  })

  it('parses and saves editable cards', () => {
    const appCards = parseAppCardsJson(
      JSON.stringify({
        'com.example.app': {
          title: 'Example',
          content: '# Example\n- Tap Search first.',
        },
      }),
    )
    const storage = memoryStorage()

    saveAppCards(appCards, storage)

    expect(resolveAppCard(appCards, 'com.example.app')).toContain('Tap Search')
    expect(storage.setItem).toHaveBeenCalledWith(
      'webdroid-agent-app-cards',
      expect.stringContaining('com.example.app'),
    )
  })

  it('clones default cards instead of sharing mutable objects', () => {
    const first = createDefaultAppCards()
    const second = createDefaultAppCards()

    first['com.android.chrome'].content = 'changed'

    expect(second['com.android.chrome'].content).toContain('address bar')
  })
})
