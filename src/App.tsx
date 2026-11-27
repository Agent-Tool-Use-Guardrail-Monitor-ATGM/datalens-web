import { useState } from 'react'
import './App.css'
import AppStatus, { type AppStatusType } from './AppStatus'
import DatasetWorkspace from './datasets/DatasetWorkspace'
import RunHistory from './runs/RunHistory'
import AskData from './AskData'
import Dashboard from './dashboard/Dashboard'
import { USE_MOCK_DATA } from './config'
import { useAuth } from './auth/useAuth'

type WorkspacePage = 'overview' | 'datasets' | 'runs'

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
  const {
    user,
    profile,
    isLoading,
    isProfileLoading,
    error,
    profileError,
    signIn,
    signOut,
  } = useAuth()

  const [currentPage, setCurrentPage] = useState<WorkspacePage>('overview')
  const previewStatus = new URLSearchParams(window.location.search).get('status')

  // Status previews are available only during local development.
  if (USE_MOCK_DATA && isAppStatusType(previewStatus)) {
    return <AppStatus status={previewStatus} />
  }

  if (isLoading) {
    return <AppStatus status="loading" />
  }

  if (!user) {
    return (
      <main className="app-status">
        <h1>Welcome to DataLens</h1>
        <p>Sign in to access your data workspace.</p>
        {error && <p role="alert">{error}</p>}
        <button onClick={() => void signIn()}>
          Sign in with DataLens
        </button>
      </main>
    )
  }

  const backendProfile =
    profile?.profile_status === 'ready' ? profile.profile : null

  const displayName =
    backendProfile?.display_name ||
    backendProfile?.username ||
    'My account'

  const profileDescription = isProfileLoading
    ? 'Loading profile...'
    : profileError
      ? 'Profile unavailable'
      : profile?.profile_status === 'synchronizing'
        ? 'Profile synchronizing'
        : backendProfile?.email || 'Signed in'

  const pageTitle =
    currentPage === 'datasets'
      ? 'Datasets'
      : currentPage === 'runs'
        ? 'Run history'
        : 'Overview'

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">D</div>
          <span>DataLens</span>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation" aria-label="Workspace navigation">
          <button
            type="button"
            className={`nav-item ${currentPage === 'overview' ? 'active' : ''}`}
            onClick={() => setCurrentPage('overview')}
            aria-current={currentPage === 'overview' ? 'page' : undefined}
          >
            <span>▦</span> Overview
          </button>

          <button
            type="button"
            className={`nav-item ${currentPage === 'datasets' ? 'active' : ''}`}
            onClick={() => setCurrentPage('datasets')}
            aria-current={currentPage === 'datasets' ? 'page' : undefined}
          >
            <span>▤</span> Datasets
          </button>

          <button
            type="button"
            className={`nav-item ${currentPage === 'runs' ? 'active' : ''}`}
            onClick={() => setCurrentPage('runs')}
            aria-current={currentPage === 'runs' ? 'page' : undefined}
          >
            <span>◷</span> Run history
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{displayName}</strong>
              <small>{profileDescription}</small>
            </div>
          </div>

          <button onClick={() => void signOut()}>
            Sign out
          </button>

          <div className="version">DataLens · Preview</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> {pageTitle}
          </div>
          <div className="status">
            <span className="status-dot"></span>
            Signed in
          </div>
        </header>

        <div className="content">
          {currentPage === 'datasets' ? (
            <DatasetWorkspace />
          ) : currentPage === 'runs' ? (
            <RunHistory />
          ) : (
            <>
              <Dashboard onNavigate={setCurrentPage} />
              <AskData onSubmitted={() => setCurrentPage('runs')} />
              <footer>
                DataLens <span>·</span> Your data, understood.
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
