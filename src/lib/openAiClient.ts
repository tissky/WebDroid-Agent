import { buildChatCompletionPayload, buildFinalResponsePayload } from './openAiPayload'
import {
  extractAssistantText,
  formatApiError,
  readJsonOrUndefined,
  readStreamingAssistantText,
} from './openAiResponse'
import { OpenAiClientError } from './openAiErrors'
import type {
  ChatCompletionPayload,
  FinalResponseRequest,
  CompletionRequest,
  OpenAiClient,
  RepairActionRequest,
} from './openAiTypes'

export { buildChatCompletionPayload } from './openAiPayload'
export { OpenAiClientError } from './openAiErrors'
export { extractAssistantText } from './openAiResponse'
export {
  type AgentConversationMessage,
  type AgentHistoryItem,
  type ChatCompletionPayload,
  type ChatMessage,
  type CompletionRequest,
  type FinalResponseRequest,
  type ModelConfig,
  type OpenAiClient,
  type RepairActionRequest,
  type UserContent,
} from './openAiTypes'

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '')
}

export const DEFAULT_OPENAI_RETRY_DELAYS_MS = [500, 1000] as const

export type OpenAiClientOptions = {
  proxyUrl?: string
  retryDelaysMs?: readonly number[]
}

export function createOpenAiClient(
  fetcher: typeof fetch = fetch,
  options: OpenAiClientOptions = {},
): OpenAiClient {
  async function completePayload(
    request: Pick<CompletionRequest, 'baseUrl' | 'apiKey' | 'stream' | 'signal'>,
    payload: ChatCompletionPayload,
  ) {
    const proxyUrl = options.proxyUrl?.trim()
    const url = proxyUrl || `${normalizeBaseUrl(request.baseUrl)}/chat/completions`
    const response = await fetchWithRetry(
      fetcher,
      url,
      {
        method: 'POST',
        headers: proxyUrl
          ? {
              'Content-Type': 'application/json',
            }
          : {
              Authorization: `Bearer ${request.apiKey}`,
              'Content-Type': 'application/json',
            },
        signal: request.signal,
        body: JSON.stringify(
          proxyUrl
            ? {
                baseUrl: request.baseUrl,
                apiKey: request.apiKey,
                payload,
              }
            : payload,
        ),
      },
      {
        retryDelaysMs: options.retryDelaysMs ?? DEFAULT_OPENAI_RETRY_DELAYS_MS,
        signal: request.signal,
      },
    )

    if (request.stream) {
      if (!response.ok) {
        const body = await readJsonOrUndefined(response)
        throw new OpenAiClientError(formatApiError(response.status, body))
      }
      return readStreamingAssistantText(response)
    }

    const body = await readJsonOrUndefined(response)

    if (!response.ok) {
      throw new OpenAiClientError(formatApiError(response.status, body))
    }

    return extractAssistantText(body)
  }

  async function completeAction(request: CompletionRequest) {
    return completePayload(request, buildChatCompletionPayload(request))
  }

  async function completeFinalResponse(request: FinalResponseRequest) {
    return completePayload(request, buildFinalResponsePayload(request))
  }

  return {
    completeAction,
    completeFinalResponse,
    repairAction(request) {
      return completeAction({
        ...request,
        task: buildRepairTask(request),
        stream: false,
      })
    },
  }
}

type RetryOptions = {
  retryDelaysMs: readonly number[]
  signal?: AbortSignal
}

async function fetchWithRetry(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  { retryDelaysMs, signal }: RetryOptions,
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetcher(url, init)
      if (!shouldRetryResponse(response) || attempt >= retryDelaysMs.length) {
        return response
      }
      await discardResponseBody(response)
    } catch (caught) {
      if (isAbortError(caught) || attempt >= retryDelaysMs.length) {
        throw caught
      }
    }

    await waitForRetry(retryDelaysMs[attempt] ?? 0, signal)
  }
}

function shouldRetryResponse(response: Response) {
  return (
    response.status === 408 ||
    response.status === 409 ||
    response.status === 425 ||
    response.status === 429 ||
    response.status >= 500
  )
}

async function discardResponseBody(response: Response) {
  try {
    await response.body?.cancel()
  } catch {
    // Best effort only; the next attempt should not be blocked by cleanup failure.
  }
}

function waitForRetry(delayMs: number, signal?: AbortSignal) {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('OpenAI request aborted.', 'AbortError'))
  }
  if (delayMs <= 0) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false
    const timeoutId = globalThis.setTimeout(() => {
      settled = true
      signal?.removeEventListener('abort', abort)
      resolve()
    }, delayMs)
    function abort() {
      if (settled) {
        return
      }
      settled = true
      globalThis.clearTimeout(timeoutId)
      reject(new DOMException('OpenAI request aborted.', 'AbortError'))
    }
    signal?.addEventListener('abort', abort, { once: true })
  })
}

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

function buildRepairTask(request: RepairActionRequest) {
  return [
    request.task,
    '',
    'The previous model action output was invalid. Repair only the action output for the same screenshot and task.',
    `<invalid_action_output>\n${request.invalidOutput}\n</invalid_action_output>`,
    `<validation_error>\n${request.validationError}\n</validation_error>`,
    request.actionProtocol === 'open_autoglm_function'
      ? 'Return one corrected Open-AutoGLM <think>...</think><answer>...</answer> action. No markdown.'
      : request.actionProtocol === 'mobilerun_xml'
        ? 'Return one corrected mobilerun <function_calls>...</function_calls> tool call block. No markdown.'
        : 'Return only one corrected canonical JSON action object. No markdown, no prose.',
  ].join('\n')
}
