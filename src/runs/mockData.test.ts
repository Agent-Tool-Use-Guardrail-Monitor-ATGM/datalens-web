import { describe, expect, it } from 'vitest'
import {
  mockConversations,
  mockMessages,
  mockRuns,
} from './mockData'
import {
  validateConversation,
  validateConversationMessage,
  validateRunRecord,
} from './types'

describe('run mock fixtures', () => {
  it('provides three example conversations', () => {
    expect(mockConversations).toHaveLength(3)
    expect(mockConversations.every(
      (conversation) => validateConversation(conversation).length === 0,
    )).toBe(true)
  })

  it('provides valid conversation messages', () => {
    expect(mockMessages).toHaveLength(6)
    expect(mockMessages.every(
      (message) => validateConversationMessage(message).length === 0,
    )).toBe(true)
  })

  it('provides valid run records', () => {
    expect(mockRuns).toHaveLength(3)
    expect(mockRuns.every(
      (run) => validateRunRecord(run).length === 0,
    )).toBe(true)
  })

  it('includes a completed run with a verified result reference', () => {
    const run = mockRuns.find((item) => item.outcome === 'completed')

    expect(run).toBeDefined()
    expect(run?.results).toHaveLength(1)
    expect(run?.results[0].artifact_sha256).toMatch(/^[a-f0-9]{64}$/i)
  })

  it('includes a terminal clarification request', () => {
    const run = mockRuns.find((item) => item.outcome === 'needs_input')

    expect(run?.lifecycle).toBe('finished')
    expect(run?.clarification?.options.length).toBeGreaterThan(0)
  })

  it('retains verified results for an incomplete run', () => {
    const run = mockRuns.find((item) => item.outcome === 'incomplete')

    expect(run?.lifecycle).toBe('finished')
    expect(run?.results).toHaveLength(1)
    expect(run?.results[0].run_id).toBe(run?.run_id)
  })
})
