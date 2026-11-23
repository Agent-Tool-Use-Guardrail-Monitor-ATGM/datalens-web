
import { describe, expect, it } from 'vitest'
import {
  validateConversation,
  validateConversationMessage,
  validateRunRecord,
  validateRunSubmission,
  type AnalysisRun,
  type Conversation,
  type ConversationMessage,
  type RunSubmission,
} from './types'

const baseRun: AnalysisRun = {
  run_id: 'run-1',
  conversation_id: 'conversation-1',
  lifecycle: 'queued',
  outcome: null,
  created_at: '2026-11-23T10:00:00Z',
  started_at: null,
  completed_at: null,
  dataset_snapshots: [],
  results: [],
  clarification: null,
}

const baseSubmission: RunSubmission = {
  idempotency_key: '123e4567-e89b-42d3-a456-426614174000',
  conversation_id: 'conversation-1',
  question: 'Summarize this dataset.',
  dataset_ids: [],
  prior_tool_call_ids: [],
}

const result = {
  conversation_id: 'conversation-1',
  run_id: 'run-1',
  tool_call_id: 'tool-1',
  dataset_snapshot: {
    dataset_id: 'dataset-1',
    sha256: 'a'.repeat(64),
  },
  artifact_id: 'artifact-1',
  artifact_sha256: 'b'.repeat(64),
  media_type: 'application/json',
}

describe('run contract validation', () => {
  it('accepts a queued run without execution data', () => {
    expect(validateRunRecord(baseRun)).toEqual([])
  })

  it('rejects a queued run that already has a start time', () => {
    const run = { ...baseRun, started_at: '2026-11-23T10:01:00Z' }

    expect(validateRunRecord(run).map((issue) => issue.code))
      .toContain('invalid_queued_run')
  })

  it('accepts a running run with a start time and verified partial results', () => {
    const run: AnalysisRun = {
      ...baseRun,
      lifecycle: 'running',
      started_at: '2026-11-23T10:01:00Z',
      results: [result],
    }

    expect(validateRunRecord(run)).toEqual([])
  })

  it('rejects a running run without a start time', () => {
    const run: AnalysisRun = {
      ...baseRun,
      lifecycle: 'running',
    }

    expect(validateRunRecord(run).map((issue) => issue.code))
      .toContain('invalid_running_run')
  })

  it('accepts a completed run with verified results', () => {
    const run: AnalysisRun = {
      ...baseRun,
      lifecycle: 'finished',
      outcome: 'completed',
      completed_at: '2026-11-23T10:02:00Z',
      results: [result],
    }

    expect(validateRunRecord(run)).toEqual([])
  })

  it('rejects a completed run without result references', () => {
    const run: AnalysisRun = {
      ...baseRun,
      lifecycle: 'finished',
      outcome: 'completed',
      completed_at: '2026-11-23T10:02:00Z',
    }

    expect(validateRunRecord(run).map((issue) => issue.code))
      .toContain('completed_without_results')
  })

  it('accepts needs_input only with a clarification request', () => {
    const run: AnalysisRun = {
      ...baseRun,
      lifecycle: 'finished',
      outcome: 'needs_input',
      completed_at: '2026-11-23T10:02:00Z',
      clarification: {
        question: 'Which date column should I use?',
        options: [
          { key: 'created', text: 'Created date' },
          { key: 'updated', text: 'Updated date' },
        ],
      },
    }

    expect(validateRunRecord(run)).toEqual([])
  })

  it('rejects needs_input without clarification', () => {
    const run: AnalysisRun = {
      ...baseRun,
      lifecycle: 'finished',
      outcome: 'needs_input',
      completed_at: '2026-11-23T10:02:00Z',
    }

    expect(validateRunRecord(run).map((issue) => issue.code))
      .toContain('missing_clarification')
  })

  it('accepts an incomplete run that retains verified partial results', () => {
    const run: AnalysisRun = {
      ...baseRun,
      lifecycle: 'finished',
      outcome: 'incomplete',
      completed_at: '2026-11-23T10:02:00Z',
      results: [result],
    }

    expect(validateRunRecord(run)).toEqual([])
  })

  it('rejects clarification data on a non-needs_input outcome', () => {
    const run: AnalysisRun = {
      ...baseRun,
      lifecycle: 'finished',
      outcome: 'incomplete',
      completed_at: '2026-11-23T10:02:00Z',
      clarification: {
        question: 'Choose a column.',
        options: [],
      },
    }

    expect(validateRunRecord(run).map((issue) => issue.code))
      .toContain('unexpected_clarification')
  })

  it('rejects duplicate dataset snapshots', () => {
    const snapshot = { dataset_id: 'dataset-1', sha256: 'a'.repeat(64) }
    const run = {
      ...baseRun,
      dataset_snapshots: [snapshot, snapshot],
    }

    expect(validateRunRecord(run).map((issue) => issue.code))
      .toContain('duplicate_datasets')
  })

  it('rejects more than 16 selected datasets', () => {
    const run = {
      ...baseRun,
      dataset_snapshots: Array.from({ length: 17 }, (_, index) => ({
        dataset_id: `dataset-${index}`,
        sha256: 'a'.repeat(64),
      })),
    }

    expect(validateRunRecord(run).map((issue) => issue.code))
      .toContain('too_many_datasets')
  })

  it('rejects an invalid dataset SHA-256 hash', () => {
    const run: AnalysisRun = {
      ...baseRun,
      dataset_snapshots: [
        { dataset_id: 'dataset-1', sha256: 'invalid-hash' },
      ],
    }

    expect(validateRunRecord(run).map((issue) => issue.code))
      .toContain('invalid_dataset_hash')
  })

  it('rejects an invalid artifact SHA-256 hash', () => {
    const run: AnalysisRun = {
      ...baseRun,
      lifecycle: 'running',
      started_at: '2026-11-23T10:01:00Z',
      results: [{ ...result, artifact_sha256: 'invalid-hash' }],
    }

    expect(validateRunRecord(run).map((issue) => issue.code))
      .toContain('invalid_result_hash')
  })
})

describe('run submission validation', () => {
  it('accepts a valid submission', () => {
    expect(validateRunSubmission(baseSubmission)).toEqual([])
  })

  it('rejects a non-UUID idempotency key', () => {
    const submission = { ...baseSubmission, idempotency_key: 'not-a-uuid' }

    expect(validateRunSubmission(submission).map((issue) => issue.code))
      .toContain('invalid_idempotency_key')
  })

  it('rejects an empty question', () => {
    const submission = { ...baseSubmission, question: '   ' }

    expect(validateRunSubmission(submission).map((issue) => issue.code))
      .toContain('invalid_question')
  })

  it('rejects duplicate dataset selections', () => {
    const submission = {
      ...baseSubmission,
      dataset_ids: ['dataset-1', 'dataset-1'],
    }

    expect(validateRunSubmission(submission).map((issue) => issue.code))
      .toContain('duplicate_datasets')
  })

  it('rejects more than 16 selected datasets', () => {
    const submission = {
      ...baseSubmission,
      dataset_ids: Array.from({ length: 17 }, (_, index) => `dataset-${index}`),
    }

    expect(validateRunSubmission(submission).map((issue) => issue.code))
      .toContain('too_many_datasets')
  })

  it('rejects duplicate prior tool-call references', () => {
    const submission = {
      ...baseSubmission,
      prior_tool_call_ids: ['tool-1', 'tool-1'],
    }

    expect(validateRunSubmission(submission).map((issue) => issue.code))
      .toContain('duplicate_prior_results')
  })
})

const baseConversation: Conversation = {
  conversation_id: 'conversation-1',
  title: 'Dataset analysis',
  created_at: '2026-11-23T10:00:00Z',
  updated_at: '2026-11-23T10:00:00Z',
}

const baseMessage: ConversationMessage = {
  message_id: 'message-1',
  conversation_id: 'conversation-1',
  run_id: 'run-1',
  sequence: 1,
  role: 'user',
  content: 'Summarize this dataset.',
  created_at: '2026-11-23T10:00:00Z',
}

describe('conversation validation', () => {
  it('accepts a valid conversation', () => {
    expect(validateConversation(baseConversation)).toEqual([])
  })

  it('rejects an empty conversation title', () => {
    const conversation = { ...baseConversation, title: '   ' }

    expect(validateConversation(conversation).map((issue) => issue.code))
      .toContain('invalid_conversation_title')
  })

  it('rejects a title longer than 120 characters', () => {
    const conversation = { ...baseConversation, title: 'a'.repeat(121) }

    expect(validateConversation(conversation).map((issue) => issue.code))
      .toContain('invalid_conversation_title')
  })

  it('accepts a valid conversation message', () => {
    expect(validateConversationMessage(baseMessage)).toEqual([])
  })

  it('rejects a message with a non-positive sequence', () => {
    const message = { ...baseMessage, sequence: 0 }

    expect(validateConversationMessage(message).map((issue) => issue.code))
      .toContain('invalid_message_sequence')
  })

  it('rejects a message with a fractional sequence', () => {
    const message = { ...baseMessage, sequence: 1.5 }

    expect(validateConversationMessage(message).map((issue) => issue.code))
      .toContain('invalid_message_sequence')
  })

  it('rejects empty message content', () => {
    const message = { ...baseMessage, content: '   ' }

    expect(validateConversationMessage(message).map((issue) => issue.code))
      .toContain('invalid_message_content')
  })

  it('rejects message content longer than 16384 characters', () => {
    const message = { ...baseMessage, content: 'a'.repeat(16385) }

    expect(validateConversationMessage(message).map((issue) => issue.code))
      .toContain('invalid_message_content')
  })
})
