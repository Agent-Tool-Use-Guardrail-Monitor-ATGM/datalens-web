import type {
  AnalysisRun,
  Conversation,
  ConversationMessage,
  DatasetSnapshot,
  RunSubmission,
} from './types'
import {
  validateRunRecord,
  validateRunSubmission,
} from './types'
import type {
  ConversationHistory,
  ConversationPage,
  RunPage,
  RunService,
} from './service'
import {
  mockConversations,
  mockMessages,
  mockRuns,
} from './mockData'

export class MockRunServiceError extends Error {
  public readonly code:
    | 'invalid_submission'
    | 'conversation_busy'
    | 'idempotency_conflict'
    | 'resource_unavailable'

  constructor(
    code:
      | 'invalid_submission'
      | 'conversation_busy'
      | 'idempotency_conflict'
      | 'resource_unavailable',
    message: string,
  ) {
    super(message)
    this.code = code
    this.name = 'MockRunServiceError'
  }
}

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

function paginate<T>(
  items: T[],
  limit = DEFAULT_PAGE_SIZE,
  cursor?: string,
): { items: T[]; next_cursor: string | null } {
  const safeLimit = Math.min(
    Math.max(Math.floor(limit) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  )

  const start = cursor ? Number(cursor) : 0

  if (!Number.isInteger(start) || start < 0 || start > items.length) {
    throw new MockRunServiceError(
      'resource_unavailable',
      'The requested page is unavailable.',
    )
  }

  const pageItems = items.slice(start, start + safeLimit)
  const next = start + pageItems.length

  return {
    items: pageItems,
    next_cursor: next < items.length ? String(next) : null,
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function fingerprint(submission: RunSubmission): string {
  return JSON.stringify({
    conversation_id: submission.conversation_id,
    question: submission.question,
    dataset_ids: [...submission.dataset_ids].sort(),
    prior_tool_call_ids: [...submission.prior_tool_call_ids].sort(),
  })
}

function createId(): string {
  return crypto.randomUUID()
}

export class MockRunService implements RunService {
  private conversations: Conversation[] = clone(mockConversations)
  private messages: ConversationMessage[] = clone(mockMessages)
  private runs: AnalysisRun[] = clone(mockRuns)

  private idempotency = new Map<
    string,
    { fingerprint: string; runId: string }
  >()

  private sequence = this.messages.reduce(
    (maximum, message) => Math.max(maximum, message.sequence),
    0,
  )

  async listConversations(
    limit?: number,
    cursor?: string,
  ): Promise<ConversationPage> {
    const sorted = [...this.conversations].sort(
      (a, b) => b.updated_at.localeCompare(a.updated_at),
    )

    return paginate(sorted, limit, cursor)
  }

  async getConversationHistory(
    conversationId: string,
    limit?: number,
    cursor?: string,
  ): Promise<ConversationHistory> {
    const conversation = this.conversations.find(
      (item) => item.conversation_id === conversationId,
    )

    if (!conversation) {
      throw new MockRunServiceError(
        'resource_unavailable',
        'Conversation is unavailable.',
      )
    }

    const messages = this.messages
      .filter((item) => item.conversation_id === conversationId)
      .sort((a, b) => a.sequence - b.sequence)

    const page = paginate(messages, limit, cursor)

    return {
      conversation: clone(conversation),
      messages: page.items,
      next_cursor: page.next_cursor,
    }
  }

  async listConversationRuns(
    conversationId: string,
    limit?: number,
    cursor?: string,
  ): Promise<RunPage> {
    if (!this.conversations.some(
      (item) => item.conversation_id === conversationId,
    )) {
      throw new MockRunServiceError(
        'resource_unavailable',
        'Conversation is unavailable.',
      )
    }

    const runs = this.runs
      .filter((item) => item.conversation_id === conversationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))

    return paginate(runs, limit, cursor)
  }

  async submitRun(submission: RunSubmission): Promise<AnalysisRun> {
    const issues = validateRunSubmission(submission)

    if (issues.length > 0) {
      throw new MockRunServiceError(
        'invalid_submission',
        issues.map((issue) => issue.message).join(' '),
      )
    }

    const conversation = this.conversations.find(
      (item) => item.conversation_id === submission.conversation_id,
    )

    if (!conversation) {
      throw new MockRunServiceError(
        'resource_unavailable',
        'Conversation is unavailable.',
      )
    }

    const key = `${submission.conversation_id}:${submission.idempotency_key}`
    const contentFingerprint = fingerprint(submission)
    const previous = this.idempotency.get(key)

    if (previous) {
      if (previous.fingerprint !== contentFingerprint) {
        throw new MockRunServiceError(
          'idempotency_conflict',
          'This idempotency key was already used with different content.',
        )
      }

      const original = this.runs.find(
        (item) => item.run_id === previous.runId,
      )

      if (!original) {
        throw new MockRunServiceError(
          'resource_unavailable',
          'The original run is unavailable.',
        )
      }

      return clone(original)
    }

    const activeRun = this.runs.find(
      (item) =>
        item.conversation_id === submission.conversation_id &&
        (item.lifecycle === 'queued' || item.lifecycle === 'running'),
    )

    if (activeRun) {
      throw new MockRunServiceError(
        'conversation_busy',
        'This conversation already has an active run.',
      )
    }

    const now = new Date().toISOString()
    const runId = createId()

    const datasetSnapshots: DatasetSnapshot[] =
      submission.dataset_ids.map((datasetId) => ({
        dataset_id: datasetId,
        sha256: 'a'.repeat(64),
      }))

    const run: AnalysisRun = {
      run_id: runId,
      conversation_id: submission.conversation_id,
      lifecycle: 'queued',
      outcome: null,
      created_at: now,
      started_at: null,
      completed_at: null,
      dataset_snapshots: datasetSnapshots,
      results: [],
      clarification: null,
    }

    const runIssues = validateRunRecord(run)

    if (runIssues.length > 0) {
      throw new MockRunServiceError(
        'invalid_submission',
        'The generated run failed contract validation.',
      )
    }

    this.runs.push(run)
    this.idempotency.set(key, {
      fingerprint: contentFingerprint,
      runId,
    })

    this.sequence += 1
    this.messages.push({
      message_id: createId(),
      conversation_id: submission.conversation_id,
      run_id: runId,
      sequence: this.sequence,
      role: 'user',
      content: submission.question,
      created_at: now,
    })

    conversation.updated_at = now

    return clone(run)
  }

  async getRun(
    conversationId: string,
    runId: string,
  ): Promise<AnalysisRun> {
    const run = this.runs.find(
      (item) =>
        item.conversation_id === conversationId &&
        item.run_id === runId,
    )

    if (!run) {
      throw new MockRunServiceError(
        'resource_unavailable',
        'Run is unavailable.',
      )
    }

    return clone(run)
  }
}

