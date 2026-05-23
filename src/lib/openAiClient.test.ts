import { describe, expect, it, vi } from 'vitest'
import { createOpenAiClient, normalizeBaseUrl } from './openAiClient'

describe('normalizeBaseUrl', () => {
  it('removes trailing slashes', () => {
    expect(normalizeBaseUrl('https://api.example.com/v1///')).toBe('https://api.example.com/v1')
  })
})

describe('createOpenAiClient', () => {
  it('posts to /chat/completions with bearer auth', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"action":"done"}' } }] }),
    })) as unknown as typeof fetch
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
    const fetcher = vi.fn(async () => ({
      ok: true,
      body,
      json: async () => {
        throw new Error('streaming responses should not be read as JSON')
      },
    })) as unknown as typeof fetch
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
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"action":"tap","x":100,"y":200}' } }],
      }),
    })) as unknown as typeof fetch
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
})
