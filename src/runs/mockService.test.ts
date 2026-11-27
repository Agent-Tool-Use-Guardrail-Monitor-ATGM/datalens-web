import { describe, expect, it } from 'vitest'
import {
  MockRunService,
  MockRunServiceError,
} from './mockService'
import type { RunSubmission } from './types'

function createSubmission(
  overrides: Partial<RunSubmission> = {},
): RunSubmission {
  return {
    idempotency_key: '11111111-1111-4111-8111-111111111111',
    conversation_id: 'conversation-demo-001',
    question: 'Analyze the monthly sales trend.',
    dataset_ids: ['dataset-demo-sales'],
    prior_tool_call_ids: [],
    ...overrides,
  }
}

describe('MockRunService', () => {
  it('paginates conversations', async () => {
    const service = new MockRunService()

    const firstPage = await service.listConversations(2)

    expect(firstPage.items).toHaveLength(2)
    expect(firstPage.next_cursor).toBe('2')

    const secondPage = await service.listConversations(
      2,
      firstPage.next_cursor!,
    )

    expect(secondPage.items).toHaveLength(1)
    expect(secondPage.next_cursor).toBeNull()
  })

  it('paginates conversation messages', async () => {
    const service = new MockRunService()

    const firstPage = await service.getConversationHistory(
      'conversation-demo-001',
      1,
    )

    expect(firstPage.messages).toHaveLength(1)
    expect(firstPage.next_cursor).toBe('1')

    const secondPage = await service.getConversationHistory(
      'conversation-demo-001',
      1,
      firstPage.next_cursor!,
    )

    expect(secondPage.messages).toHaveLength(1)
    expect(secondPage.next_cursor).toBeNull()
  })

  it('retrieves a run belonging to its conversation', async () => {
    const service = new MockRunService()

    const run = await service.getRun(
      'conversation-demo-001',
      'run-demo-001',
    )

    expect(run.outcome).toBe('completed')
  })

  it('creates a new queued run and records the user message', async () => {
    const service = new MockRunService()
    const submission = createSubmission()

    const run = await service.submitRun(submission)
    const history = await service.getConversationHistory(
      submission.conversation_id,
    )

    expect(run.lifecycle).toBe('queued')
    expect(run.outcome).toBeNull()
    expect(history.messages).toHaveLength(3)
    expect(history.messages[2].content).toBe(submission.question)
  })

  it('returns the original run for an identical idempotency replay', async () => {
    const service = new MockRunService()
    const submission = createSubmission()

    const original = await service.submitRun(submission)
    const replay = await service.submitRun(submission)

    expect(replay.run_id).toBe(original.run_id)

    const history = await service.getConversationHistory(
      submission.conversation_id,
    )

    expect(history.messages).toHaveLength(3)
  })

  it('rejects an idempotency key reused with different content', async () => {
    const service = new MockRunService()
    const submission = createSubmission()

    await service.submitRun(submission)

    await expect(
      service.submitRun({
        ...submission,
        question: 'A different question',
      }),
    ).rejects.toMatchObject({
      code: 'idempotency_conflict',
    })
  })

  it('rejects a different submission while a conversation is busy', async () => {
    const service = new MockRunService()

    await service.submitRun(createSubmission())

    await expect(
      service.submitRun(
        createSubmission({
          idempotency_key: '22222222-2222-4222-8222-222222222222',
          question: 'Another analysis',
        }),
      ),
    ).rejects.toBeInstanceOf(MockRunServiceError)

    await expect(
      service.submitRun(
        createSubmission({
          idempotency_key: '33333333-3333-4333-8333-333333333333',
          question: 'Another analysis',
        }),
      ),
    ).rejects.toMatchObject({
      code: 'conversation_busy',
    })
  })
})
