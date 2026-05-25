import { describe, expect, it, vi } from 'vitest'
import { createOpenAiClient, normalizeBaseUrl } from './openAiClient'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

function completionResponse(content: string) {
  return jsonResponse({ choices: [{ message: { content } }] })
}

describe('normalizeBaseUrl', () => {
  it('removes trailing slashes', () => {
    expect(normalizeBaseUrl('https://api.example.com/v1///')).toBe('https://api.example.com/v1')
  })
})

describe('createOpenAiClient', () => {
  it('posts to /chat/completions with bearer auth', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => completionResponse('{"action":"done"}'))
    const client = createOpenAiClient(fetcher)

    const text = await client.completeAction({
      baseUrl: 'https://api.example.com/v1/',
      apiKey: 'secret',
      model: 'agent-model',
      task: 'Finish',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 10, height: 20 },
    })

    expect(text).toBe('{"action":"done"}')
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer secret',
          'Content-Type': 'application/json',
        },
      }),
    )
  })

  it('posts model config and payload to a local proxy when configured', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => completionResponse('{"action":"done"}'))
    const client = createOpenAiClient(fetcher, {
      proxyUrl: '/api/openai/chat/completions',
    })

    const text = await client.completeAction({
      baseUrl: 'https://api.example.com/v1/',
      apiKey: 'secret',
      model: 'agent-model',
      task: 'Finish',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 10, height: 20 },
    })

    expect(text).toBe('{"action":"done"}')
    expect(fetcher).toHaveBeenCalledWith(
      '/api/openai/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )
    const proxyBody = JSON.parse(String(vi.mocked(fetcher).mock.calls[0][1]?.body))
    expect(proxyBody.baseUrl).toBe('https://api.example.com/v1/')
    expect(proxyBody.apiKey).toBe('secret')
    expect(proxyBody.payload.model).toBe('agent-model')
    expect(proxyBody.payload.messages).toBeTruthy()
  })

  it('aggregates streamed chat completion chunks', async () => {
    const encoder = new TextEncoder()
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            [
              'data: {"choices":[{"delta":{"content":"{\\"action\\":"}}]}\n\n',
              'data: {"choices":[{"delta":{"content":"\\"done\\"}"}}]}\n\n',
              'data: [DONE]\n\n',
            ].join(''),
          ),
        )
        controller.close()
      },
    })
    const fetcher = vi.fn<typeof fetch>(async () => new Response(body))
    const client = createOpenAiClient(fetcher)

    const text = await client.completeAction({
      baseUrl: 'https://api.example.com/v1/',
      apiKey: 'secret',
      model: 'agent-model',
      stream: true,
      task: 'Finish',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 10, height: 20 },
    })

    expect(text).toBe('{"action":"done"}')
  })

  it('sends invalid action output and validation errors when repairing an action', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      completionResponse('{"action":"tap","x":100,"y":200}'),
    )
    const client = createOpenAiClient(fetcher)

    const text = await client.repairAction?.({
      baseUrl: 'https://api.example.com/v1/',
      apiKey: 'secret',
      model: 'agent-model',
      stream: true,
      task: 'Open Settings',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 1080, height: 2400 },
      invalidOutput: '{"action":"tap","x":9999,"y":200}',
      validationError: 'Point is outside the current screen.',
    })

    expect(text).toBe('{"action":"tap","x":100,"y":200}')
    const requestBody = JSON.parse(String(vi.mocked(fetcher).mock.calls[0][1]?.body))
    expect(requestBody.stream).toBeUndefined()
    expect(requestBody.response_format).toEqual({ type: 'json_object' })
    expect(requestBody.messages[1].content[0].text).toContain('Repair only the action output')
    expect(requestBody.messages[1].content[0].text).toContain(
      '{"action":"tap","x":9999,"y":200}',
    )
    expect(requestBody.messages[1].content[0].text).toContain(
      'Point is outside the current screen.',
    )
  })

  it('requests a natural-language final response without JSON mode', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => completionResponse('All set.'))
    const client = createOpenAiClient(fetcher)

    const text = await client.completeFinalResponse?.({
      baseUrl: 'https://api.example.com/v1/',
      apiKey: 'secret',
      model: 'agent-model',
      task: 'Open Bluetooth settings',
      conversation: [{ id: 'u1', role: 'user', content: 'Open Bluetooth settings' }],
      progressSummary: 'Bluetooth settings is open.',
    })

    expect(text).toBe('All set.')
    const requestBody = JSON.parse(String(vi.mocked(fetcher).mock.calls[0][1]?.body))
    expect(requestBody.response_format).toBeUndefined()
    expect(requestBody.stream).toBeUndefined()
    expect(requestBody.messages.at(-1).content).toContain('Write the final answer now.')
  })

  it('passes abort signals to the completion request fetch', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn<typeof fetch>(async () => completionResponse('{"action":"done"}'))
    const client = createOpenAiClient(fetcher)

    await client.completeAction({
      baseUrl: 'https://api.example.com/v1/',
      apiKey: 'secret',
      model: 'agent-model',
      task: 'Finish',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 10, height: 20 },
      signal: controller.signal,
    })

    expect(vi.mocked(fetcher).mock.calls[0][1]?.signal).toBe(controller.signal)
  })

  it('retries retryable HTTP failures before returning the completion', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ error: { message: 'rate limited' } }, { status: 429 }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'busy' } }, { status: 503 }))
      .mockResolvedValueOnce(completionResponse('{"action":"done"}'))
    const client = createOpenAiClient(fetcher, { retryDelaysMs: [0, 0] })

    const text = await client.completeAction({
      baseUrl: 'https://api.example.com/v1/',
      apiKey: 'secret',
      model: 'agent-model',
      task: 'Finish',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 10, height: 20 },
    })

    expect(text).toBe('{"action":"done"}')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('does not retry non-retryable HTTP failures', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ error: { message: 'bad key' } }, { status: 401 }),
    )
    const client = createOpenAiClient(fetcher, { retryDelaysMs: [0, 0] })

    await expect(
      client.completeAction({
        baseUrl: 'https://api.example.com/v1/',
        apiKey: 'secret',
        model: 'agent-model',
        task: 'Finish',
        screenshotDataUrl: 'data:image/png;base64,abc123',
        screen: { width: 10, height: 20 },
      }),
    ).rejects.toThrow('Model API failed with 401: bad key')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('stops after configured HTTP retry attempts are exhausted', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ error: { message: 'still busy' } }, { status: 503 }),
    )
    const client = createOpenAiClient(fetcher, { retryDelaysMs: [0, 0] })

    await expect(
      client.completeAction({
        baseUrl: 'https://api.example.com/v1/',
        apiKey: 'secret',
        model: 'agent-model',
        task: 'Finish',
        screenshotDataUrl: 'data:image/png;base64,abc123',
        screen: { width: 10, height: 20 },
      }),
    ).rejects.toThrow('Model API failed with 503: still busy')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('retries transient network failures', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(completionResponse('{"action":"done"}'))
    const client = createOpenAiClient(fetcher, { retryDelaysMs: [0] })

    const text = await client.completeAction({
      baseUrl: 'https://api.example.com/v1/',
      apiKey: 'secret',
      model: 'agent-model',
      task: 'Finish',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 10, height: 20 },
    })

    expect(text).toBe('{"action":"done"}')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not retry aborted requests', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw abortError
    })
    const client = createOpenAiClient(fetcher, { retryDelaysMs: [0, 0] })

    await expect(
      client.completeAction({
        baseUrl: 'https://api.example.com/v1/',
        apiKey: 'secret',
        model: 'agent-model',
        task: 'Finish',
        screenshotDataUrl: 'data:image/png;base64,abc123',
        screen: { width: 10, height: 20 },
      }),
    ).rejects.toThrow('The operation was aborted.')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
