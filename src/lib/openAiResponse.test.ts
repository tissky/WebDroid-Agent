import { describe, expect, it } from 'vitest'
import { extractAssistantText } from './openAiResponse'

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
