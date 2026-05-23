import { describe, expect, it } from 'vitest'
import { ActionValidationError, type AgentAction } from './actionTypes'

describe('action types', () => {
  it('exports the shared validation error and action union', () => {
    const action: AgentAction = { action: 'tap', x: 10, y: 20 }
    const error = new ActionValidationError('invalid action')

    expect(action.action).toBe('tap')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ActionValidationError')
    expect(error.message).toBe('invalid action')
  })
})
