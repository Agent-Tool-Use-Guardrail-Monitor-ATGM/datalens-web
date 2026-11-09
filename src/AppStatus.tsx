
export type AppStatusType =
  | 'loading'
  | 'signed-out'
  | 'access-denied'
  | 'unavailable'

interface AppStatusProps {
  status: AppStatusType
}

const statusContent = {
  loading: {
    title: 'Loading DataLens',
    message: 'Please wait while we prepare your workspace.',
  },
  'signed-out': {
    title: 'You are not signed in',
    message: 'Please sign in to access your DataLens workspace.',
  },
  'access-denied': {
    title: 'Access denied',
    message: 'You do not have permission to access this resource.',
  },
  unavailable: {
    title: 'Service unavailable',
    message: 'We cannot connect to DataLens right now. Please try again later.',
  },
}

function AppStatus({ status }: AppStatusProps) {
  const content = statusContent[status]

  return (
    <main className="app-status" role="status" aria-live="polite">
      {status === 'loading' && (
        <div className="loading-spinner" aria-hidden="true" />
      )}

      <h1>{content.title}</h1>
      <p>{content.message}</p>
    </main>
  )
}

export default AppStatus
