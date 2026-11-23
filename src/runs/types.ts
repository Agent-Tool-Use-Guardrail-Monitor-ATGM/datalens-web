export type ConversationRole = 'user' | 'assistant'

export type RunLifecycle = 'queued' | 'running' | 'finished'

export type RunOutcome =
  | 'completed'
  | 'needs_input'
  | 'unsupported'
  | 'incomplete'

export interface Conversation {
  conversation_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  message_id: string
  conversation_id: string
  run_id: string
  sequence: number
  role: ConversationRole
  content: string
  created_at: string
}

export interface DatasetSnapshot {
  dataset_id: string
  sha256: string
}

export interface ResultProvenance {
  conversation_id: string
  run_id: string
  tool_call_id: string
  dataset_snapshot: DatasetSnapshot
  artifact_id: string
  artifact_sha256: string
  media_type: string
}

export interface ClarificationOption {
  key: string
  text: string
}

export interface RunClarification {
  question: string
  options: ClarificationOption[]
}

export interface AnalysisRun {
  run_id: string
  conversation_id: string
  lifecycle: RunLifecycle
  outcome: RunOutcome | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  dataset_snapshots: DatasetSnapshot[]
  results: ResultProvenance[]
  clarification: RunClarification | null
}

export interface RunSubmission {
  idempotency_key: string
  conversation_id: string
  question: string
  dataset_ids: string[]
  prior_tool_call_ids: string[]
}

export interface RunContractIssue {
  code: string
  message: string
}

export function validateRunRecord(run: AnalysisRun): RunContractIssue[] {
  const issues: RunContractIssue[] = []

  if (run.dataset_snapshots.length > 16) {
    issues.push({
      code: 'too_many_datasets',
      message: 'A run cannot select more than 16 datasets.',
    })
  }

  const datasetIds = run.dataset_snapshots.map((item) => item.dataset_id)
  if (new Set(datasetIds).size !== datasetIds.length) {
    issues.push({
      code: 'duplicate_datasets',
      message: 'Dataset selections must be unique.',
    })
  }
    const sha256Pattern = /^[a-f0-9]{64}$/i

  if (run.dataset_snapshots.some((item) => !sha256Pattern.test(item.sha256))) {
    issues.push({
      code: 'invalid_dataset_hash',
      message: 'Dataset snapshots must contain valid SHA-256 hashes.',
    })
  }

  if (run.results.some((item) =>
    !sha256Pattern.test(item.dataset_snapshot.sha256) ||
    !sha256Pattern.test(item.artifact_sha256)
  )) {
    issues.push({
      code: 'invalid_result_hash',
      message: 'Result provenance must contain valid SHA-256 hashes.',
    })
  }

  if (run.lifecycle === 'queued') {
    if (
      run.started_at !== null ||
      run.completed_at !== null ||
      run.outcome !== null ||
      run.clarification !== null ||
      run.results.length > 0
    ) {
      issues.push({
        code: 'invalid_queued_run',
        message: 'A queued run cannot contain execution or terminal data.',
      })
    }
  }

  if (run.lifecycle === 'running') {
    if (
      run.started_at === null ||
      run.completed_at !== null ||
      run.outcome !== null ||
      run.clarification !== null
    ) {
      issues.push({
        code: 'invalid_running_run',
        message: 'A running run requires a start time and no terminal data.',
      })
    }
  }

  if (run.lifecycle === 'finished') {
    if (run.completed_at === null || run.outcome === null) {
      issues.push({
        code: 'invalid_finished_run',
        message: 'A finished run requires a completion time and outcome.',
      })
    }

    if (run.outcome === 'completed' && run.results.length === 0) {
      issues.push({
        code: 'completed_without_results',
        message: 'A completed run must contain verified result references.',
      })
    }

    if (run.outcome === 'needs_input' && run.clarification === null) {
      issues.push({
        code: 'missing_clarification',
        message: 'A needs_input run must contain a clarification request.',
      })
    }

    if (run.outcome !== 'needs_input' && run.clarification !== null) {
      issues.push({
        code: 'unexpected_clarification',
        message: 'Only a needs_input run may contain a clarification request.',
      })
    }
  }

  if (run.clarification) {
    const { question, options } = run.clarification

    if (question.trim().length === 0 || question.length > 512) {
      issues.push({
        code: 'invalid_clarification_question',
        message: 'A clarification question must contain 1–512 characters.',
      })
    }

    if (options.length > 8) {
      issues.push({
        code: 'too_many_clarification_options',
        message: 'A clarification may contain at most 8 options.',
      })
    }

    if (options.some((option) =>
      option.key.trim().length === 0 ||
      option.text.trim().length === 0 ||
      option.text.length > 256
    )) {
      issues.push({
        code: 'invalid_clarification_option',
        message: 'Clarification options require a key and 1–256 characters of text.',
      })
    }

    const optionKeys = options.map((option) => option.key)
    if (new Set(optionKeys).size !== optionKeys.length) {
      issues.push({
        code: 'duplicate_clarification_options',
        message: 'Clarification option keys must be unique.',
      })
    }
  }

  return issues
}

export function validateRunSubmission(
  submission: RunSubmission,
): RunContractIssue[] {
  const issues: RunContractIssue[] = []

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (!uuidPattern.test(submission.idempotency_key)) {
    issues.push({
      code: 'invalid_idempotency_key',
      message: 'The idempotency key must be a UUID.',
    })
  }

  if (
    submission.question.trim().length === 0 ||
    submission.question.length > 8192
  ) {
    issues.push({
      code: 'invalid_question',
      message: 'A question must contain 1–8192 characters.',
    })
  }

  if (submission.dataset_ids.length > 16) {
    issues.push({
      code: 'too_many_datasets',
      message: 'A submission cannot select more than 16 datasets.',
    })
  }

  if (new Set(submission.dataset_ids).size !== submission.dataset_ids.length) {
    issues.push({
      code: 'duplicate_datasets',
      message: 'Dataset selections must be unique.',
    })
  }

  if (submission.prior_tool_call_ids.length > 16) {
    issues.push({
      code: 'too_many_prior_results',
      message: 'A submission may reference at most 16 prior tool calls.',
    })
  }

  if (
    new Set(submission.prior_tool_call_ids).size !==
    submission.prior_tool_call_ids.length
  ) {
    issues.push({
      code: 'duplicate_prior_results',
      message: 'Prior tool-call references must be unique.',
    })
  }

  return issues
}

export function validateConversation(
  conversation: Conversation,
): RunContractIssue[] {
  const issues: RunContractIssue[] = []

  if (
    conversation.title.trim().length === 0 ||
    conversation.title.length > 120
  ) {
    issues.push({
      code: 'invalid_conversation_title',
      message: 'A conversation title must contain 1–120 characters.',
    })
  }

  return issues
}

export function validateConversationMessage(
  message: ConversationMessage,
): RunContractIssue[] {
  const issues: RunContractIssue[] = []

  if (message.sequence < 1 || !Number.isInteger(message.sequence)) {
    issues.push({
      code: 'invalid_message_sequence',
      message: 'A message sequence must be a positive integer.',
    })
  }

  if (
    message.content.trim().length === 0 ||
    message.content.length > 16384
  ) {
    issues.push({
      code: 'invalid_message_content',
      message: 'Message content must contain 1–16384 characters.',
    })
  }

  return issues
}