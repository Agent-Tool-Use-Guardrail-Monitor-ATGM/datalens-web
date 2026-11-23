import type {
  AnalysisRun,
  Conversation,
  ConversationMessage,
} from './types'

const DATASET_HASH = 'a'.repeat(64)
const ARTIFACT_HASH = 'b'.repeat(64)

export const mockConversations: Conversation[] = [
  {
    conversation_id: 'conversation-demo-001',
    title: 'Monthly sales analysis',
    created_at: '2026-11-20T09:00:00Z',
    updated_at: '2026-11-20T09:05:00Z',
  },
  {
    conversation_id: 'conversation-demo-002',
    title: 'Customer segmentation',
    created_at: '2026-11-19T14:00:00Z',
    updated_at: '2026-11-19T14:03:00Z',
  },
  {
    conversation_id: 'conversation-demo-003',
    title: 'Server power consumption',
    created_at: '2026-11-18T11:00:00Z',
    updated_at: '2026-11-18T11:04:00Z',
  },
]

export const mockMessages: ConversationMessage[] = [
  {
    message_id: 'message-demo-001',
    conversation_id: 'conversation-demo-001',
    run_id: 'run-demo-001',
    sequence: 1,
    role: 'user',
    content: 'Show me the monthly sales trend.',
    created_at: '2026-11-20T09:00:00Z',
  },
  {
    message_id: 'message-demo-002',
    conversation_id: 'conversation-demo-001',
    run_id: 'run-demo-001',
    sequence: 2,
    role: 'assistant',
    content: 'The analysis is complete. Sales increased by 12% compared with the previous month. A verified result is available.',
    created_at: '2026-11-20T09:05:00Z',
  },
  {
    message_id: 'message-demo-003',
    conversation_id: 'conversation-demo-002',
    run_id: 'run-demo-002',
    sequence: 1,
    role: 'user',
    content: 'Segment my customers by purchasing behavior.',
    created_at: '2026-11-19T14:00:00Z',
  },
  {
    message_id: 'message-demo-004',
    conversation_id: 'conversation-demo-002',
    run_id: 'run-demo-002',
    sequence: 2,
    role: 'assistant',
    content: 'Which field should define purchasing behavior?',
    created_at: '2026-11-19T14:03:00Z',
  },
  {
    message_id: 'message-demo-005',
    conversation_id: 'conversation-demo-003',
    run_id: 'run-demo-003',
    sequence: 1,
    role: 'user',
    content: 'Analyze server power consumption.',
    created_at: '2026-11-18T11:00:00Z',
  },
  {
    message_id: 'message-demo-006',
    conversation_id: 'conversation-demo-003',
    run_id: 'run-demo-003',
    sequence: 2,
    role: 'assistant',
    content: 'The run was interrupted before the final explanation. One verified result was retained and is shown as partial.',
    created_at: '2026-11-18T11:04:00Z',
  },
]

export const mockRuns: AnalysisRun[] = [
  {
    run_id: 'run-demo-001',
    conversation_id: 'conversation-demo-001',
    lifecycle: 'finished',
    outcome: 'completed',
    created_at: '2026-11-20T09:00:00Z',
    started_at: '2026-11-20T09:00:01Z',
    completed_at: '2026-11-20T09:05:00Z',
    dataset_snapshots: [
      {
        dataset_id: 'dataset-demo-sales',
        sha256: DATASET_HASH,
      },
    ],
    results: [
      {
        conversation_id: 'conversation-demo-001',
        run_id: 'run-demo-001',
        tool_call_id: 'tool-demo-001',
        dataset_snapshot: {
          dataset_id: 'dataset-demo-sales',
          sha256: DATASET_HASH,
        },
        artifact_id: 'artifact-demo-sales',
        artifact_sha256: ARTIFACT_HASH,
        media_type: 'text/csv',
      },
    ],
    clarification: null,
  },
  {
    run_id: 'run-demo-002',
    conversation_id: 'conversation-demo-002',
    lifecycle: 'finished',
    outcome: 'needs_input',
    created_at: '2026-11-19T14:00:00Z',
    started_at: '2026-11-19T14:00:01Z',
    completed_at: '2026-11-19T14:03:00Z',
    dataset_snapshots: [
      {
        dataset_id: 'dataset-demo-customers',
        sha256: DATASET_HASH,
      },
    ],
    results: [],
    clarification: {
      question: 'Which field should define purchasing behavior?',
      options: [
        { key: 'frequency', text: 'Purchase frequency' },
        { key: 'amount', text: 'Total purchase amount' },
        { key: 'recency', text: 'Time since last purchase' },
      ],
    },
  },
  {
    run_id: 'run-demo-003',
    conversation_id: 'conversation-demo-003',
    lifecycle: 'finished',
    outcome: 'incomplete',
    created_at: '2026-11-18T11:00:00Z',
    started_at: '2026-11-18T11:00:01Z',
    completed_at: '2026-11-18T11:04:00Z',
    dataset_snapshots: [
      {
        dataset_id: 'dataset-demo-server',
        sha256: DATASET_HASH,
      },
    ],
    results: [
      {
        conversation_id: 'conversation-demo-003',
        run_id: 'run-demo-003',
        tool_call_id: 'tool-demo-003',
        dataset_snapshot: {
          dataset_id: 'dataset-demo-server',
          sha256: DATASET_HASH,
        },
        artifact_id: 'artifact-demo-server',
        artifact_sha256: ARTIFACT_HASH,
        media_type: 'text/csv',
      },
    ],
    clarification: null,
  },
]
