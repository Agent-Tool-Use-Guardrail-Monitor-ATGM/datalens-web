import type { User } from 'oidc-client-ts'
import { oidcUserManager } from './oidc'

const TOKEN_EXPIRY_BUFFER_SECONDS = 60

let refreshPromise: Promise<User | null> | null = null

async function removeLocalUser(): Promise<void> {
  try {
    await oidcUserManager.removeUser()
  } catch {
    // Do not return an old access token if local cleanup fails.
  }
}

async function refreshUser(): Promise<User | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const currentUser = await oidcUserManager.getUser()

        if (!currentUser?.refresh_token) {
          await removeLocalUser()
          return null
        }

        const refreshedUser = await oidcUserManager.signinSilent()

        if (!refreshedUser?.access_token) {
          await removeLocalUser()
          return null
        }

        return refreshedUser
      } catch {
        await removeLocalUser()
        return null
      }
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

export async function getAccessToken(
  forceRefresh = false,
): Promise<string | null> {
  const currentUser = await oidcUserManager.getUser()

  if (!currentUser) {
    return null
  }

  const expiresSoon =
    currentUser.expires_at !== undefined &&
    currentUser.expires_at <=
      Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_BUFFER_SECONDS

  if (forceRefresh || currentUser.expired || expiresSoon) {
    const refreshedUser = await refreshUser()
    return refreshedUser?.access_token ?? null
  }

  return currentUser.access_token || null
}
