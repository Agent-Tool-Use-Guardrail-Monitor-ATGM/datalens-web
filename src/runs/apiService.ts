import { apiRequest } from '../api/client'
import type {
  AnalysisRun,
  Conversation,
  ConversationMessage,
  RunSubmission,
  DatasetSnapshot,
  ResultProvenance,
  RunOutcome,
} from './types'
import type {
  ConversationHistory,
  ConversationPage,
  RunPage,
  RunService,
} from './service'

interface ApiPage<T> {
  items: T[]
  next_cursor: string | null
}

interface ApiConversation {
  conversation_id: string
  title: string
  created_at: string
}

interface ApiMessage {
  message_id: string
  conversation_id: string
  run_id: string
  sequence: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface ApiDatasetSnapshot {
  dataset_id: string
  sha256: string
}

interface ApiResultProvenance {
  conversation_id: string
  run_id: string
  tool_call_id: string
  dataset: ApiDatasetSnapshot
  artifact: {
    artifact_id: string
    sha256: string
    media_type: string
  }
}

interface ApiRun {
  schema_version: 'conversation-run-v1' | 'conversation-run-v2'
  run_id: string
  conversation_id: string
  lifecycle: 'queued' | 'running' | 'finished'
  outcome: RunOutcome | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  selection: ApiDatasetSnapshot[]
  results: ApiResultProvenance[]
  clarification: {
    question: string
    options: { key: string; text: string }[]
  } | null
  completion?: {
    answer: {
      status: 'completed' | 'unsupported' | 'incomplete' | 'needs_input'
      explanation: string
      clarification?: {
        question: string
        options: { key: string; text: string }[]
      }
    }
    imported_results: unknown[]
  }
}

interface ApiRunAccepted {
  run_id: string
  replayed: boolean
}

function mapConversation(item: ApiConversation): Conversation {
  return {
    ...item,
    // The backend does not expose updated_at.
    updated_at: item.created_at,
  }
}

function mapMessage(item: ApiMessage): ConversationMessage {
  return item
}

function mapSnapshot(item: ApiDatasetSnapshot): DatasetSnapshot {
  return item
}

function mapProvenance(item: ApiResultProvenance): ResultProvenance {
  return {
    conversation_id: item.conversation_id,
    run_id: item.run_id,
    tool_call_id: item.tool_call_id,
    dataset_snapshot: item.dataset,
    artifact_id: item.artifact.artifact_id,
    artifact_sha256: item.artifact.sha256,
    media_type: item.artifact.media_type,
  }
}

function mapRun(item: ApiRun): AnalysisRun {
  const answer = item.completion?.answer

  return {
    run_id: item.run_id,
    conversation_id: item.conversation_id,
    lifecycle: item.lifecycle,
    outcome: item.outcome ?? answer?.status ?? null,
    created_at: item.created_at,
    started_at: item.started_at,
    completed_at: item.finished_at,
    dataset_snapshots: item.selection.map(mapSnapshot),
    results: item.results.map(mapProvenance),
    clarification:
      item.clarification ??
      (answer?.status === 'needs_input' ? answer.clarification ?? null : null),
  }
}

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }

  const result = search.toString()
  return result ? `?${result}` : ''
}

export class ApiRunService implements RunService {
  async listConversations(
    limit = 50,
    cursor?: string,
  ): Promise<ConversationPage> {
    const page = await apiRequest<ApiPage<ApiConversation>>(
      `/v1/conversations${query({ limit, after: cursor })}`,
    )

    return {
      items: page.items.map(mapConversation),
      next_cursor: page.next_cursor,
    }
  }

  async getConversationHistory(
    conversationId: string,
    limit = 100,
    cursor?: string,
  ): Promise<ConversationHistory> {
    const [conversation, page] = await Promise.all([
      apiRequest<ApiConversation>(
        `/v1/conversations/${encodeURIComponent(conversationId)}`,
      ),
      apiRequest<ApiPage<ApiMessage>>(
        `/v1/conversations/${encodeURIComponent(conversationId)}/messages${query({
          limit,
          after_sequence: cursor,
        })}`,
      ),
    ])

    return {
      conversation: mapConversation(conversation),
      messages: page.items.map(mapMessage),
      next_cursor: page.next_cursor,
    }
  }

  async listConversationRuns(
    conversationId: string,
    limit = 50,
    cursor?: string,
  ): Promise<RunPage> {
    const history = await this.getConversationHistory(conversationId, 100)
    const runIds = [
      ...new Set(
        history.messages
          .map((message) => message.run_id)
          .filter(Boolean),
      ),
    ]

    const runs = await Promise.all(
      runIds.map(async (runId) => {
        const result = await this.getRun(conversationId, runId)
        return result
      }),
    )

    runs.sort((a, b) => b.created_at.localeCompare(a.created_at))

    const offset = cursor ? Number(cursor) : 0
    const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0
    const items = runs.slice(safeOffset, safeOffset + limit)
    const nextOffset = safeOffset + items.length

    return {
      items,
      next_cursor: nextOffset < runs.length ? String(nextOffset) : null,
    }
  }

  async submitRun(submission: RunSubmission): Promise<AnalysisRun> {
    const body = {
      idempotency_key: submission.idempotency_key,
      question: submission.question,
      selection: {
        dataset_ids: submission.dataset_ids,
      },
      // Prior results must be complete backend provenance references.
      // The current frontend submission type only has tool-call IDs.
      prior_results: [],
    }

    const accepted = await apiRequest<ApiRunAccepted>(
      `/v1/conversations/${encodeURIComponent(submission.conversation_id)}/runs`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    )

    return this.getRun(submission.conversation_id, accepted.run_id)
  }

  async getRun(
    conversationId: string,
    runId: string,
  ): Promise<AnalysisRun> {
    const result = await apiRequest<ApiRun>(
      `/v1/runs/${encodeURIComponent(runId)}`,
    )

    if (result.conversation_id !== conversationId) {
      throw new Error('The requested run does not belong to this conversation.')
    }

    return mapRun(result)
  }
}
