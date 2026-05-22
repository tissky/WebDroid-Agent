import { describe, expect, it, vi } from 'vitest'
import {
  buildChatCompletionPayload,
  createOpenAiClient,
  extractAssistantText,
  normalizeBaseUrl,
} from './openAiClient'

describe('normalizeBaseUrl', () => {
  it('removes trailing slashes', () => {
    expect(normalizeBaseUrl('https://api.example.com/v1///')).toBe('https://api.example.com/v1')
  })
})

describe('buildChatCompletionPayload', () => {
  it('builds an OpenAI-compatible multimodal request', () => {
    const payload = buildChatCompletionPayload({
      model: 'agent-model',
      task: 'Open settings',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 1080, height: 2400 },
      deviceScreen: { width: 1440, height: 3120 },
    })

    expect(payload).toMatchObject({
      model: 'agent-model',
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })
    expect(payload.messages[1].content).toEqual([
      {
        type: 'text',
        text: expect.stringContaining('Open settings'),
      },
      {
        type: 'image_url',
        image_url: { url: 'data:image/png;base64,abc123' },
      },
    ])
  })

  it('asks the model for canonical JSON instead of Open-AutoGLM actions', () => {
    const payload = buildChatCompletionPayload({
      model: 'agent-model',
      task: 'Open settings',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 1080, height: 2400 },
    })

    expect(payload.messages[0].content).toContain('Return only one JSON object')
    expect(payload.messages[0].content).not.toContain('Open-AutoGLM')
    expect(payload.messages[0].content).not.toContain('do(action=')
  })

  it('describes screenshot coordinates and device mapping in the user context', () => {
    const payload = buildChatCompletionPayload({
      model: 'agent-model',
      task: 'Open settings',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 955, height: 2048 },
      deviceScreen: { width: 1080, height: 2316 },
    })

    const userMessage = payload.messages[1]
    if (
      userMessage.role !== 'user' ||
      !Array.isArray(userMessage.content) ||
      userMessage.content[0].type !== 'text'
    ) {
      throw new Error('Expected first user content item to be text.')
    }

    const userText = userMessage.content[0].text
    expect(userText).toContain('"model_screen_size":"955x2048"')
    expect(userText).toContain('"device_screen_size":"1080x2316"')
    expect(userText).toContain('"coordinate_mode":"screenshot_pixels"')
    expect(userText).toContain('"grid_divisions":10')
    expect(userText).toContain('major_lines_only')
    expect(userText).toContain('mapped back to native device pixels')
  })

  it('includes current app and previous step history in the user context', () => {
    const payload = buildChatCompletionPayload({
      model: 'agent-model',
      task: 'Open settings',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 1080, height: 2400 },
      currentApp: 'Chrome',
      deviceState: {
        app: 'Chrome',
        packageName: 'com.android.chrome',
        activity: 'com.google.android.apps.chrome.Main',
        orientation: 'portrait',
        keyboard: 'com.android.adbkeyboard/.AdbIME',
      },
      history: [
        {
          step: 1,
          currentApp: 'System Home',
          actionPreview: 'launch Chrome',
          executionResult: 'monkey -p com.android.chrome',
        },
      ],
    })

    const userMessage = payload.messages[1]
    expect(userMessage.role).toBe('user')
    if (
      userMessage.role !== 'user' ||
      !Array.isArray(userMessage.content) ||
      userMessage.content[0].type !== 'text'
    ) {
      throw new Error('Expected first user content item to be text.')
    }
    const userText = userMessage.content[0].text
    expect(userText).toContain('"current_app":"Chrome"')
    expect(userText).toContain('"package_name":"com.android.chrome"')
    expect(userText).toContain('"activity":"com.google.android.apps.chrome.Main"')
    expect(userText).toContain('"keyboard":"com.android.adbkeyboard/.AdbIME"')
    expect(userText).toContain('Step 1')
    expect(userText).toContain('launch Chrome')
    expect(userText).toContain('monkey -p com.android.chrome')
  })

  it('includes app card guidance in the user context', () => {
    const payload = buildChatCompletionPayload({
      model: 'agent-model',
      task: 'Search the web',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 1080, height: 2400 },
      currentApp: 'Chrome',
      deviceState: {
        app: 'Chrome',
        packageName: 'com.android.chrome',
      },
      appCard: '# Chrome App Card\n- Use the address bar for searches.',
    })

    const userMessage = payload.messages[1]
    if (
      userMessage.role !== 'user' ||
      !Array.isArray(userMessage.content) ||
      userMessage.content[0].type !== 'text'
    ) {
      throw new Error('Expected first user content item to be text.')
    }

    expect(userMessage.content[0].text).toContain('<app_card>')
    expect(userMessage.content[0].text).toContain('Chrome App Card')
    expect(userMessage.content[0].text).toContain('address bar')
  })

  it('includes installed launchable apps in the user context', () => {
    const payload = buildChatCompletionPayload({
      model: 'agent-model',
      task: '打开邮箱',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 1080, height: 2400 },
      installedApps: [
        { label: 'Gmail', packageName: 'com.google.android.gm' },
        { packageName: 'com.android.chrome' },
      ],
    })

    const userMessage = payload.messages[1]
    if (
      userMessage.role !== 'user' ||
      !Array.isArray(userMessage.content) ||
      userMessage.content[0].type !== 'text'
    ) {
      throw new Error('Expected first user content item to be text.')
    }

    expect(userMessage.content[0].text).toContain('<installed_apps>')
    expect(userMessage.content[0].text).toContain('Gmail: com.google.android.gm')
    expect(userMessage.content[0].text).toContain('chrome: com.android.chrome')
  })

  it('preserves conversation messages and injects current context into the latest user turn', () => {
    const payload = buildChatCompletionPayload({
      model: 'agent-model',
      task: 'Open settings',
      conversation: [
        { id: 'u1', role: 'user', content: 'Open Settings.' },
        { id: 'a1', role: 'assistant', content: '{"action":"tap","x":100,"y":200}' },
        { id: 'o1', role: 'observation', content: 'Executed tap (100, 200)' },
        { id: 'u2', role: 'user', content: 'Now open the Bluetooth page.' },
      ],
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 1080, height: 2400 },
      currentApp: 'Settings',
    })

    expect(payload.messages.map((message) => message.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
      'user',
    ])
    expect(payload.messages[1]).toEqual({
      role: 'user',
      content: 'Open Settings.',
    })
    expect(payload.messages[2]).toEqual({
      role: 'assistant',
      content: '{"action":"tap","x":100,"y":200}',
    })
    expect(payload.messages[3]).toEqual({
      role: 'user',
      content: '<observation>\nExecuted tap (100, 200)\n</observation>',
    })

    const latestUserMessage = payload.messages[4]
    if (latestUserMessage.role !== 'user' || !Array.isArray(latestUserMessage.content)) {
      throw new Error('Expected latest user message to be multimodal.')
    }
    expect(latestUserMessage.content[0]).toEqual({
      type: 'text',
      text: expect.stringContaining('Now open the Bluetooth page.'),
    })
    expect(latestUserMessage.content[0]).toEqual({
      type: 'text',
      text: expect.stringContaining('"current_app":"Settings"'),
    })
    expect(latestUserMessage.content[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,abc123' },
    })
  })

  it('enables streaming when requested by the model config', () => {
    const payload = buildChatCompletionPayload({
      model: 'agent-model',
      task: 'Open settings',
      screenshotDataUrl: 'data:image/png;base64,abc123',
      screen: { width: 1080, height: 2400 },
      stream: true,
    })

    expect(payload.stream).toBe(true)
  })

})

describe('extractAssistantText', () => {
  it('reads assistant content from a chat completion response', () => {
    expect(
      extractAssistantText({
        choices: [{ message: { content: '{"action":"done"}' } }],
      }),
    ).toBe('{"action":"done"}')
  })

  it('rejects empty completion responses', () => {
    expect(() => extractAssistantText({ choices: [] })).toThrow('No assistant content')
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
