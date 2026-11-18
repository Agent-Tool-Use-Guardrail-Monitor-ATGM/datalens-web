import type { User } from 'oidc-client-ts'
import { oidcUserManager } from './oidc'

const TOKEN_EXPIRY_BUFFER_SECONDS = 60

let sessionVersion = 0
let sessionActive = true

interface RefreshOperation {
  version: number
  promise: Promise<User | null>
}

let refreshOperation: RefreshOperation | null = null

/**
 * Invalidates the current session and waits for its refresh to finish.
 */
export async function invalidateTokenSession(): Promise<void> {
  sessionVersion += 1
  sessionActive = false

  const pendingRefresh = refreshOperation?.promise ?? null
  refreshOperation = null

  if (pendingRefresh) {
    await pendingRefresh
  }
}

/**
 * Activates a new session after any previous refresh has finished.
 */
export async function activateTokenSession(): Promise<void> {
  const pendingRefresh = refreshOperation?.promise ?? null

  sessionVersion += 1
  sessionActive = false
  refreshOperation = null

  if (pendingRefresh) {
    await pendingRefresh
  }

  sessionVersion += 1
  sessionActive = true
}

async function removeLocalUser(): Promise<void> {
  try {
    await oidcUserManager.removeUser()
  } catch {
    // Do not return an old access token if local cleanup fails.
  }
}

function refreshUser(version: number): Promise<User | null> {
  if (version !== sessionVersion || !sessionActive) {
    return Promise.resolve(null)
  }

  if (refreshOperation?.version === version) {
    return refreshOperation.promise
  }

  const promise = (async () => {
    try {
      const currentUser = await oidcUserManager.getUser()

      if (version !== sessionVersion || !sessionActive) {
        return null
      }

      if (!currentUser?.refresh_token) {
        await removeLocalUser()
        return null
      }

      const refreshedUser = await oidcUserManager.signinSilent()

      if (version !== sessionVersion || !sessionActive) {
        return null
      }

      if (!refreshedUser?.access_token) {
        await removeLocalUser()
        return null
      }

      return refreshedUser
    } catch {
      if (version === sessionVersion && sessionActive) {
        await removeLocalUser()
      }

      return null
    }
  })()

  const operation: RefreshOperation = { version, promise }
  refreshOperation = operation

  void promise.finally(() => {
    if (refreshOperation === operation) {
      refreshOperation = null
    }
  })

  return promise
}

export async function getAccessToken(
  forceRefresh = false,
): Promise<string | null> {
  if (!sessionActive) {
    return null
  }

  const version = sessionVersion
  const currentUser = await oidcUserManager.getUser()

  if (
    version !== sessionVersion ||
    !sessionActive ||
    !currentUser
  ) {
    return null
  }

  const expiresSoon =
    currentUser.expires_at !== undefined &&
    currentUser.expires_at <=
      Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_BUFFER_SECONDS

  if (forceRefresh || currentUser.expired || expiresSoon) {
    const refreshedUser = await refreshUser(version)

    if (version !== sessionVersion || !sessionActive) {
      return null
    }

    return refreshedUser?.access_token ?? null
  }

  return currentUser.access_token || null
}
