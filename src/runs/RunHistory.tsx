import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AnalysisRun,
  Conversation,
  ConversationMessage,
} from './types'
import { MockRunService } from './mockService'
import { ApiRunService } from './apiService'
import { USE_MOCK_DATA } from '../config'

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString()
}

function getRunStatus(run: AnalysisRun) {
  if (run.lifecycle === 'queued') return 'Queued'
  if (run.lifecycle === 'running') return 'Running'

  if (run.outcome === 'completed') return 'Completed'
  if (run.outcome === 'needs_input') return 'Needs input'
  if (run.outcome === 'unsupported') return 'Unsupported'

  if (run.outcome === 'incomplete' && run.results.length > 0) {
    return 'Incomplete — verified results retained'
  }

  return 'Incomplete'
}

export default function RunHistory() {
  const service = useMemo(
    () => USE_MOCK_DATA ? new MockRunService() : new ApiRunService(),
    [],
  )

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [runs, setRuns] = useState<AnalysisRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = useCallback(async () => {
    const page = await service.listConversations()
    setConversations(page.items)

    setSelectedConversationId((current) => {
      if (
        current &&
        page.items.some((item) => item.conversation_id === current)
      ) {
        return current
      }

      return page.items[0]?.conversation_id ?? null
    })
  }, [service])

  const loadSelectedConversation = useCallback(async (
    conversationId: string,
  ) => {
    const [history, runPage] = await Promise.all([
      service.getConversationHistory(conversationId),
      service.listConversationRuns(conversationId),
    ])

    setMessages(history.messages)
    setRuns(runPage.items)
  }, [service])

  // Load the conversation list when the page opens.
  useEffect(() => {
    let active = true

    async function load() {
      try {
        setIsLoading(true)
        setError(null)

        const page = await service.listConversations()

        if (!active) return

        setConversations(page.items)
        setSelectedConversationId((current) =>
          current && page.items.some(
            (item) => item.conversation_id === current,
          )
            ? current
            : page.items[0]?.conversation_id ?? null,
        )
      } catch {
        if (active) {
          setError('Could not load conversation history.')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [service])

  // Load messages and runs whenever the selected conversation changes.
  useEffect(() => {
    const conversationId = selectedConversationId

    if (!conversationId) {
      setMessages([])
      setRuns([])
      return
    }

    let active = true

    async function load() {
      try {
        setIsLoading(true)
        setError(null)

        const [history, runPage] = await Promise.all([
          service.getConversationHistory(conversationId!),
          service.listConversationRuns(conversationId!),
        ])

        if (!active) return

        setMessages(history.messages)
        setRuns(runPage.items)
      } catch {
        if (active) {
          setError('Could not load this conversation. Please try again.')
          setMessages([])
          setRuns([])
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [selectedConversationId, service])

  async function refresh() {
    try {
      setIsRefreshing(true)
      setError(null)

      await loadConversations()

      if (selectedConversationId) {
        await loadSelectedConversation(selectedConversationId)
      }
    } catch {
      setError('Could not refresh conversation history.')
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading && conversations.length === 0) {
    return (
      <section className="welcome">
        <p className="eyebrow">YOUR WORKSPACE</p>
        <h1>Run history</h1>
        <p className="subtitle">Loading your conversations...</p>
      </section>
    )
  }

  return (
    <section className="run-history">
      <div className="run-history-heading">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1>Run history</h1>
          <p className="subtitle">
            Review previous conversations and their analysis runs.
          </p>
        </div>

        <div>
          {USE_MOCK_DATA && (
            <span className="demo-label">Development demo data</span>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="run-error" role="alert">
          {error}
        </div>
      )}

      {conversations.length === 0 && !error ? (
        <div className="empty-state">
          <div className="empty-icon">◷</div>
          <strong>No conversations yet</strong>
          <p>Your analysis conversations will appear here.</p>
        </div>
      ) : (
        <div className="run-history-layout">
          <aside className="conversation-list">
            <h2>Conversations</h2>

            {conversations.map((conversation) => (
              <button
                key={conversation.conversation_id}
                type="button"
                className={`conversation-item ${
                  selectedConversationId === conversation.conversation_id
                    ? 'selected'
                    : ''
                }`}
                onClick={() =>
                  setSelectedConversationId(conversation.conversation_id)
                }
              >
                <strong>{conversation.title}</strong>
                <span>{formatDate(conversation.created_at)}</span>
              </button>
            ))}
          </aside>

          <div className="conversation-content">
            {isLoading ? (
              <p>Loading conversation...</p>
            ) : (
              <>
                <section className="conversation-messages">
                  <h2>Conversation</h2>

                  {messages.length === 0 ? (
                    <p className="muted-text">
                      No messages in this conversation.
                    </p>
                  ) : (
                    messages.map((message) => (
                      <article
                        className={`message-card message-${message.role}`}
                        key={message.message_id}
                      >
                        <div className="message-header">
                          <strong>
                            {message.role === 'user' ? 'You' : 'Assistant'}
                          </strong>
                          <span>{formatDate(message.created_at)}</span>
                        </div>
                        <p>{message.content}</p>
                      </article>
                    ))
                  )}
                </section>

                <section className="conversation-runs">
                  <h2>Analysis runs</h2>

                  {runs.length === 0 ? (
                    <p className="muted-text">No analysis runs found.</p>
                  ) : (
                    runs.map((run) => (
                      <article className="run-card" key={run.run_id}>
                        <div className="run-card-header">
                          <strong>Run {run.run_id}</strong>
                          <span
                            className={`run-status status-${run.outcome ?? run.lifecycle}`}
                          >
                            {getRunStatus(run)}
                          </span>
                        </div>

                        <p>
                          <strong>Lifecycle:</strong> {run.lifecycle}
                        </p>

                        {run.outcome && (
                          <p>
                            <strong>Outcome:</strong> {run.outcome}
                          </p>
                        )}

                        <p>
                          <strong>Started:</strong>{' '}
                          {run.started_at
                            ? formatDate(run.started_at)
                            : 'Not started'}
                        </p>

                        <p>
                          <strong>Finished:</strong>{' '}
                          {run.completed_at
                            ? formatDate(run.completed_at)
                            : 'Not finished'}
                        </p>

                        <p>
                          <strong>Selected datasets:</strong>{' '}
                          {run.dataset_snapshots.length}
                        </p>

                        {run.results.length > 0 && (
                          <p>
                            <strong>Verified results:</strong>{' '}
                            {run.results.length}
                          </p>
                        )}

                        {run.clarification && (
                          <div className="clarification-preview">
                            <strong>Clarification requested</strong>
                            <p>{run.clarification.question}</p>
                            {run.clarification.options.map((option) => (
                              <p key={option.key}>{option.text}</p>
                            ))}
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
