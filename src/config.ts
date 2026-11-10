
export function isMockDataEnabled(
  env: {
    DEV: boolean
    VITE_USE_MOCK_DATA?: string
  } = import.meta.env,
): boolean {
  return env.DEV && env.VITE_USE_MOCK_DATA === 'true'
}

export const USE_MOCK_DATA = isMockDataEnabled()
