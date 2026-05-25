export type AgentResourceStorage = Pick<Storage, 'getItem' | 'setItem'>

export type SecretRecord = {
  id: string
  label: string
  value: string
}

export type SecretDescriptor = Omit<SecretRecord, 'value'>

export type CustomToolDefinition = {
  name: string
  description: string
  result: string
}

export type CustomToolDescriptor = Omit<CustomToolDefinition, 'result'>

const SECRETS_KEY = 'webdroid-agent-secrets'
const CUSTOM_TOOLS_KEY = 'webdroid-agent-custom-tools'

export function loadSecretRecords(storage: AgentResourceStorage = localStorage) {
  try {
    return parseSecretRecordsJson(storage.getItem(SECRETS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveSecretRecords(
  records: readonly SecretRecord[],
  storage: AgentResourceStorage = localStorage,
) {
  storage.setItem(SECRETS_KEY, serializeSecretRecords(records))
}

export function serializeSecretRecords(records: readonly SecretRecord[]) {
  return JSON.stringify(normalizeSecretRecords(records), null, 2)
}

export function parseSecretRecordsJson(raw: string) {
  return normalizeSecretRecords(JSON.parse(raw))
}

export function normalizeSecretRecords(value: unknown): SecretRecord[] {
  if (!Array.isArray(value)) {
    return []
  }

  const records: SecretRecord[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }
    const id = readIdentifier(item.id)
    const label = readText(item.label) || id
    const secretValue = typeof item.value === 'string' ? item.value : ''
    if (!id || seen.has(id) || !secretValue) {
      continue
    }
    seen.add(id)
    records.push({ id, label, value: secretValue })
  }
  return records
}

export function secretDescriptors(records: readonly SecretRecord[]): SecretDescriptor[] {
  return records.map(({ id, label }) => ({ id, label }))
}

export function resolveSecretValue(records: readonly SecretRecord[], secretId: string) {
  return records.find((record) => record.id === secretId)?.value
}

export function loadCustomToolDefinitions(storage: AgentResourceStorage = localStorage) {
  try {
    return parseCustomToolDefinitionsJson(storage.getItem(CUSTOM_TOOLS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveCustomToolDefinitions(
  definitions: readonly CustomToolDefinition[],
  storage: AgentResourceStorage = localStorage,
) {
  storage.setItem(CUSTOM_TOOLS_KEY, serializeCustomToolDefinitions(definitions))
}

export function serializeCustomToolDefinitions(definitions: readonly CustomToolDefinition[]) {
  return JSON.stringify(normalizeCustomToolDefinitions(definitions), null, 2)
}

export function parseCustomToolDefinitionsJson(raw: string) {
  return normalizeCustomToolDefinitions(JSON.parse(raw))
}

export function normalizeCustomToolDefinitions(value: unknown): CustomToolDefinition[] {
  if (!Array.isArray(value)) {
    return []
  }

  const definitions: CustomToolDefinition[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }
    const name = readIdentifier(item.name)
    const description = readText(item.description)
    const result = readText(item.result)
    if (!name || !description || !result || seen.has(name)) {
      continue
    }
    seen.add(name)
    definitions.push({ name, description, result })
  }
  return definitions
}

export function customToolDescriptors(
  definitions: readonly CustomToolDefinition[],
): CustomToolDescriptor[] {
  return definitions.map(({ name, description }) => ({ name, description }))
}

export function resolveCustomTool(
  definitions: readonly CustomToolDefinition[],
  name: string,
) {
  return definitions.find((definition) => definition.name === name)
}

function readIdentifier(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }
  const trimmed = value.trim()
  return /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(trimmed) ? trimmed : ''
}

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
