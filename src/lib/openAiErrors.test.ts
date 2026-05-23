import { describe, expect, it } from 'vitest'
import { OpenAiClientError } from './openAiErrors'

describe('OpenAiClientError', () => {
  it('keeps a stable error name for model client failures', () => {
    expect(new OpenAiClientError('failed')).toMatchObject({
      message: 'failed',
      name: 'OpenAiClientError',
    })
  })
})
