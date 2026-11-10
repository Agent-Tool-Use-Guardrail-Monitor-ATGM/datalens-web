
import './App.css'
import AppStatus, { type AppStatusType } from './AppStatus'
import { USE_MOCK_DATA } from './config'

const previewStatuses = [
  'loading',
  'signed-out',
  'access-denied',
  'unavailable',
] as const

function isAppStatusType(value: string | null): value is AppStatusType {
  return value !== null && previewStatuses.includes(value as AppStatusType)
}

function App() {
  const previewStatus = new URLSearchParams(window.location.search).get('status')

  // Status previews are available only during local development.
  if (USE_MOCK_DATA && isAppStatusType(previewStatus)) {
    return <AppStatus status={previewStatus} />
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">D</div>
          <span>DataLens</span>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation">
          <a href="#" className="nav-item active">
            <span>▦</span> Overview
          </a>
          <a href="#" className="nav-item">
            <span>▤</span> Datasets
          </a>
          <a href="#" className="nav-item">
            <span>◷</span> Run history
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">U</div>
            <div>
              <strong>My account</strong>
              <small>Workspace member</small>
            </div>
          </div>
          <div className="version">DataLens · Preview</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Overview</div>
          <div className="status">
            <span className="status-dot"></span>
            Local preview
          </div>
        </header>

        <div className="content">
          <section className="welcome">
            <p className="eyebrow">YOUR DATA WORKSPACE</p>
            <h1>Make sense of your data.</h1>
            <p className="subtitle">
              Explore datasets, ask questions, and discover insights
              with your AI statistics assistant.
            </p>
          </section>

          <section className="question-card">
            <div className="card-heading">
              <div>
                <h2>Ask your data</h2>
                <p>Start by selecting a dataset and entering a question.</p>
              </div>
              <span className="ai-label">✦ AI ASSISTANT</span>
            </div>

            <label htmlFor="dataset">SELECT DATASET</label>
            <select id="dataset" defaultValue="">
              <option value="" disabled>Choose a dataset...</option>
              <option value="demo">Demo dataset (preview only)</option>
            </select>

            <label htmlFor="question">YOUR QUESTION</label>
            <textarea
              id="question"
              placeholder="e.g. What are the main trends in this dataset?"
              rows={4}
            />

            <div className="question-footer">
              <span>Connect a dataset to get started.</span>
              <button disabled>Run analysis ↗</button>
            </div>
          </section>

          <section className="activity-section">
            <div className="section-heading">
              <div>
                <h2>Recent activity</h2>
                <p>Your latest analysis runs will appear here.</p>
              </div>
              <a href="#">View history →</a>
            </div>

            <div className="empty-state">
              <div className="empty-icon">◷</div>
              <strong>No activity yet</strong>
              <p>Your analysis history will appear here once you run your first query.</p>
            </div>
          </section>

          <footer>
            DataLens <span>·</span> Your data, understood.
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
