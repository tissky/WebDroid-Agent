import { describe, expect, it } from 'vitest'
import {
  customToolDescriptors,
  loadCustomToolDefinitions,
  loadSecretRecords,
  normalizeCustomToolDefinitions,
  normalizeSecretRecords,
  resolveCustomTool,
  resolveSecretValue,
  secretDescriptors,
} from './agentResources'

function memoryStorage(initial: Record<string, string>) {
  return {
    getItem: (key: string) => initial[key] ?? null,
    setItem: () => undefined,
  }
}

describe('agent resources', () => {
  it('normalizes secrets and exposes prompt-safe descriptors', () => {
    const records = normalizeSecretRecords([
      { id: 'gmail_password', label: 'Gmail password', value: 'secret' },
      { id: 'bad id', label: 'Bad', value: 'skip' },
      { id: 'empty_secret', label: 'Empty', value: '' },
    ])

    expect(records).toEqual([
      { id: 'gmail_password', label: 'Gmail password', value: 'secret' },
    ])
    expect(secretDescriptors(records)).toEqual([
      { id: 'gmail_password', label: 'Gmail password' },
    ])
    expect(resolveSecretValue(records, 'gmail_password')).toBe('secret')
  })

  it('normalizes configured custom tools', () => {
    const tools = normalizeCustomToolDefinitions([
      {
        name: 'lookup_order',
        description: 'Lookup a local fixture.',
        result: 'Order is ready.',
      },
      {
        name: 'bad tool',
        description: 'Invalid name.',
        result: 'skip',
      },
    ])

    expect(customToolDescriptors(tools)).toEqual([
      { name: 'lookup_order', description: 'Lookup a local fixture.' },
    ])
    expect(resolveCustomTool(tools, 'lookup_order')?.result).toBe('Order is ready.')
  })

  it('falls back to empty editable resources when stored JSON is invalid', () => {
    const storage = memoryStorage({
      'webdroid-agent-secrets': '{bad json',
      'webdroid-agent-custom-tools': '{bad json',
    })

    expect(loadSecretRecords(storage)).toEqual([])
    expect(loadCustomToolDefinitions(storage)).toEqual([])
  })
})
