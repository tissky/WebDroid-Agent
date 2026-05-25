import type { AgentSettingsSnapshot, AgentThread } from './agentThread'
import type { ModelConfig } from './openAiTypes'
import { compactScreenshotForMemory } from './screenshot'

const DATABASE_NAME = 'webdroid-agent-threads'
const DATABASE_VERSION = 1
const THREAD_STORE = 'threads'
const UPDATED_AT_INDEX = 'updatedAt'

export type AgentThreadSummary = {
  id: string
  title: string
  status: AgentThread['status']
  task: string
  createdAt: number
  updatedAt: number
}

export type AgentThreadStore = {
  save(thread: AgentThread): Promise<void>
  load(threadId: string): Promise<AgentThread | null>
  loadLatest(): Promise<AgentThread | null>
  list(): Promise<AgentThreadSummary[]>
  delete(threadId: string): Promise<void>
  clear(): Promise<void>
}

export type CreateSettingsSnapshotInput = Omit<AgentSettingsSnapshot, 'modelConfig'> & {
  modelConfig?: ModelConfig
}

export function createSettingsSnapshot({
  modelConfig,
  ...rest
}: CreateSettingsSnapshotInput): AgentSettingsSnapshot {
  return {
    ...rest,
    ...(modelConfig
      ? {
          modelConfig: {
            baseUrl: modelConfig.baseUrl,
            model: modelConfig.model,
            stream: modelConfig.stream,
          },
        }
      : {}),
  }
}

export function createMemoryThreadStore(initialThreads: readonly AgentThread[] = []): AgentThreadStore {
  const threads = new Map<string, AgentThread>()
  for (const thread of initialThreads) {
    threads.set(thread.id, cloneThread(thread))
  }

  return {
    async save(thread) {
      threads.set(thread.id, cloneThread(thread))
    },
    async load(threadId) {
      const thread = threads.get(threadId)
      return thread ? cloneThread(thread) : null
    },
    async loadLatest() {
      const [latest] = sortedThreads([...threads.values()])
      return latest ? cloneThread(latest) : null
    },
    async list() {
      return sortedThreads([...threads.values()]).map(toThreadSummary)
    },
    async delete(threadId) {
      threads.delete(threadId)
    },
    async clear() {
      threads.clear()
    },
  }
}

export function createIndexedDbThreadStore(
  options: {
    indexedDb?: IDBFactory
    databaseName?: string
  } = {},
): AgentThreadStore {
  const indexedDb = options.indexedDb ?? globalThis.indexedDB
  const databaseName = options.databaseName ?? DATABASE_NAME

  if (!indexedDb) {
    return createMemoryThreadStore()
  }

  return {
    async save(thread) {
      await withDatabase(indexedDb, databaseName, (database) =>
        runTransaction(database, 'readwrite', (store) => store.put(cloneThread(thread))),
      )
    },
    async load(threadId) {
      const result = await withDatabase(indexedDb, databaseName, (database) =>
        runTransaction<AgentThread | undefined>(database, 'readonly', (store) =>
          store.get(threadId),
        ),
      )
      return result ? compactThreadForMemory(result) : null
    },
    async loadLatest() {
      const result = await withDatabase(indexedDb, databaseName, loadLatestThread)
      return result ? compactThreadForMemory(result) : null
    },
    async list() {
      return withDatabase(indexedDb, databaseName, listThreadSummaries)
    },
    async delete(threadId) {
      await withDatabase(indexedDb, databaseName, (database) =>
        runTransaction(database, 'readwrite', (store) => store.delete(threadId)),
      )
    },
    async clear() {
      await withDatabase(indexedDb, databaseName, (database) =>
        runTransaction(database, 'readwrite', (store) => store.clear()),
      )
    },
  }
}

async function withDatabase<Result>(
  indexedDb: IDBFactory,
  databaseName: string,
  run: (database: IDBDatabase) => Promise<Result>,
) {
  const database = await openDatabase(indexedDb, databaseName)
  try {
    return await run(database)
  } finally {
    database.close()
  }
}

function openDatabase(indexedDb: IDBFactory, databaseName: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(databaseName, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      const store = database.objectStoreNames.contains(THREAD_STORE)
        ? request.transaction?.objectStore(THREAD_STORE)
        : database.createObjectStore(THREAD_STORE, { keyPath: 'id' })
      if (store && !store.indexNames.contains(UPDATED_AT_INDEX)) {
        store.createIndex(UPDATED_AT_INDEX, 'updatedAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open thread store.'))
  })
}

function runTransaction<Result = undefined>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<Result>,
) {
  return new Promise<Result>((resolve, reject) => {
    const transaction = database.transaction(THREAD_STORE, mode)
    const store = transaction.objectStore(THREAD_STORE)
    const request = run(store)
    request.onerror = () => reject(request.error ?? new Error('Thread store request failed.'))
    transaction.oncomplete = () => resolve(request.result)
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Thread store transaction failed.'))
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Thread store transaction aborted.'))
  })
}

function listThreadSummaries(database: IDBDatabase) {
  return new Promise<AgentThreadSummary[]>((resolve, reject) => {
    const transaction = database.transaction(THREAD_STORE, 'readonly')
    const store = transaction.objectStore(THREAD_STORE)
    const index = store.indexNames.contains(UPDATED_AT_INDEX)
      ? store.index(UPDATED_AT_INDEX)
      : null
    const source = index ?? store
    const summaries: AgentThreadSummary[] = []
    const request = source.openCursor(null, index ? 'prev' : 'next')

    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        resolve(index ? summaries : summaries.sort((left, right) => right.updatedAt - left.updatedAt))
        return
      }

      summaries.push(toThreadSummary(cursor.value as AgentThread))
      cursor.continue()
    }
    request.onerror = () => reject(request.error ?? new Error('Failed to list thread summaries.'))
  })
}

function loadLatestThread(database: IDBDatabase) {
  return new Promise<AgentThread | undefined>((resolve, reject) => {
    const transaction = database.transaction(THREAD_STORE, 'readonly')
    const store = transaction.objectStore(THREAD_STORE)
    const index = store.indexNames.contains(UPDATED_AT_INDEX)
      ? store.index(UPDATED_AT_INDEX)
      : null

    if (!index) {
      const request = store.getAll()
      request.onsuccess = () => resolve(sortedThreads(request.result as AgentThread[])[0])
      request.onerror = () => reject(request.error ?? new Error('Failed to load latest thread.'))
      return
    }

    const request = index.openCursor(null, 'prev')
    request.onsuccess = () => resolve(request.result?.value as AgentThread | undefined)
    request.onerror = () => reject(request.error ?? new Error('Failed to load latest thread.'))
  })
}

function sortedThreads(threads: AgentThread[]) {
  return [...threads].sort((left, right) => right.updatedAt - left.updatedAt)
}

function toThreadSummary(thread: AgentThread): AgentThreadSummary {
  return {
    id: thread.id,
    title: thread.title,
    status: thread.status,
    task: thread.task,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
  }
}

function cloneThread(thread: AgentThread): AgentThread {
  const clone =
    typeof structuredClone === 'function'
      ? structuredClone(thread)
      : (JSON.parse(JSON.stringify(thread)) as AgentThread)

  return compactThreadForMemory(clone)
}

function compactThreadForMemory(thread: AgentThread): AgentThread {
  if (thread.lastScreenshot) {
    thread.lastScreenshot = compactScreenshotForMemory(thread.lastScreenshot)
  }
  if (thread.deviceSnapshot?.screenshot) {
    thread.deviceSnapshot = {
      ...thread.deviceSnapshot,
      screenshot: compactScreenshotForMemory(thread.deviceSnapshot.screenshot),
    }
  }

  for (const turn of thread.turns) {
    if (turn.deviceSnapshot.screenshot) {
      turn.deviceSnapshot = {
        currentApp: turn.deviceSnapshot.currentApp,
        deviceState: turn.deviceSnapshot.deviceState,
      }
    }
    if (turn.compacted) {
      turn.promptContext = ''
    }
  }

  for (const event of thread.events) {
    if (event.type === 'device_snapshot') {
      delete event.screenshot
    }
  }

  return thread
}
