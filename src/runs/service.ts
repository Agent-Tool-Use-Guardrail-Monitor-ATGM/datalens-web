import type {
  AnalysisRun,
  Conversation,
  ConversationMessage,
  RunSubmission,
} from './types'

export interface ConversationPage {
  items: Conversation[]
  next_cursor: string | null
}

export interface ConversationHistory {
  conversation: Conversation
  messages: ConversationMessage[]
  next_cursor: string | null
}

export interface RunPage {
  items: AnalysisRun[]
  next_cursor: string | null
}

export interface RunService {
  listConversations(
    limit?: number,
    cursor?: string,
  ): Promise<ConversationPage>

  getConversationHistory(
    conversationId: string,
    limit?: number,
    cursor?: string,
  ): Promise<ConversationHistory>

  listConversationRuns(
    conversationId: string,
    limit?: number,
    cursor?: string,
  ): Promise<RunPage>

  submitRun(
    submission: RunSubmission,
  ): Promise<AnalysisRun>

  getRun(
    conversationId: string,
    runId: string,
  ): Promise<AnalysisRun>
}
