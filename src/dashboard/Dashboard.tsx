import { useEffect, useState } from 'react'
import { listDatasets, type DatasetMetadata } from '../api/datasets'
import { ApiRunService } from '../runs/apiService'
import type { AnalysisRun, Conversation } from '../runs/types'
import './Dashboard.css'

interface DashboardProps {
  onNavigate: (page: 'datasets' | 'runs') => void
}

const runService = new ApiRunService()

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Dashboard({ onNavigate }: DashboardProps) {
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [runs, setRuns] = useState<AnalysisRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const [datasetPage, conversationPage] = await Promise.all([
          listDatasets(50),
          runService.listConversations(20),
        ])

        const runPages = await Promise.all(
          conversationPage.items.slice(0, 10).map(async (conversation) => {
            try {
              const page = await runService.listConversationRuns(
                conversation.conversation_id,
                20,
              )
              return page.items
            } catch {
              return []
            }
          }),
        )

        if (!active) return

        setDatasets(datasetPage.items)
        setConversations(conversationPage.items)
        setRuns(
          runPages.flat()
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 6),
        )
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load dashboard data.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDashboard()
    return () => {
      active = false
    }
  }, [])

  const totalRows = datasets.reduce((total, dataset) => total + dataset.row_count, 0)
  const formatCount = (value: number) => value.toLocaleString()

  return (
    <section className="dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">WORKSPACE OVERVIEW</p>
          <h1>Your data at a glance.</h1>
          <p className="dashboard-subtitle">
            Track your datasets and recent analysis activity in one place.
          </p>
        </div>
        <button className="dashboard-refresh" onClick={() => window.location.reload()}>
          Refresh
        </button>
      </div>

      {error && <p className="dashboard-error" role="alert">{error}</p>}

      <div className="dashboard-stats">
        <article className="dashboard-stat">
          <span className="stat-icon purple">▤</span>
          <div>
            <p>Datasets</p>
            <strong>{loading ? '—' : formatCount(datasets.length)}</strong>
            <small>Available in your workspace</small>
          </div>
        </article>
        <article className="dashboard-stat">
          <span className="stat-icon blue">▦</span>
          <div>
            <p>Data rows</p>
            <strong>{loading ? '—' : formatCount(totalRows)}</strong>
            <small>Across loaded datasets</small>
          </div>
        </article>
        <article className="dashboard-stat">
          <span className="stat-icon green">☷</span>
          <div>
            <p>Conversations</p>
            <strong>{loading ? '—' : formatCount(conversations.length)}</strong>
            <small>Latest conversations</small>
          </div>
        </article>
        <article className="dashboard-stat">
          <span className="stat-icon orange">◷</span>
          <div>
            <p>Recent analyses</p>
            <strong>{loading ? '—' : formatCount(runs.length)}</strong>
            <small>Latest runs found</small>
          </div>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel recent-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Your latest analysis runs</p>
            </div>
            <button className="dashboard-link" onClick={() => onNavigate('runs')}>
              View all
            </button>
          </div>

          {loading ? (
            <div className="dashboard-empty">Loading recent activity...</div>
          ) : runs.length === 0 ? (
            <div className="dashboard-empty">
              <span className="dashboard-empty-icon">◷</span>
              <strong>No analysis runs yet</strong>
              <p>Ask a question about one of your datasets to get started.</p>
            </div>
          ) : (
            <div className="recent-run-list">
              {runs.map((run) => {
                const conversation = conversations.find(
                  (item) => item.conversation_id === run.conversation_id,
                )
                const status = run.lifecycle === 'finished'
                  ? run.outcome ?? 'finished'
                  : run.lifecycle

                return (
                  <button
                    className="recent-run"
                    key={run.run_id}
                    onClick={() => onNavigate('runs')}
                  >
                    <span className="recent-run-icon">▦</span>
                    <span className="recent-run-info">
                      <strong>{conversation?.title || 'Data analysis'}</strong>
                      <small>{formatDate(run.created_at)}</small>
                    </span>
                    <span className={`recent-run-status status-${status}`}>
                      {status.replace('_', ' ')}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="dashboard-panel quick-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Quick actions</h2>
              <p>Continue working with your data</p>
            </div>
          </div>
          <button className="quick-action" onClick={() => onNavigate('datasets')}>
            <span className="quick-action-icon">＋</span>
            <span><strong>Manage datasets</strong><small>Upload, preview, or remove CSV files</small></span>
            <span className="quick-arrow">→</span>
          </button>
          <button className="quick-action" onClick={() => onNavigate('runs')}>
            <span className="quick-action-icon">◷</span>
            <span><strong>View run history</strong><small>Review previous analyses and results</small></span>
            <span className="quick-arrow">→</span>
          </button>
        </section>
      </div>

      <p className="dashboard-footnote">
        Dashboard statistics are based on the latest data returned by the workspace API.
      </p>
    </section>
  )
}

export default Dashboard
