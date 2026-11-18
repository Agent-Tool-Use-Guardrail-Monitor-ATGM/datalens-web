import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from 'oidc-client-ts'
import { AuthContext } from './AuthContext'
import { oidcUserManager } from './oidc'
import { getCurrentProfile, type Me } from './profile'
import {
  activateTokenSession,
  invalidateTokenSession,
} from './token'

let callbackPromise: Promise<User> | null = null

function processSigninCallback(): Promise<User> {
  callbackPromise ??= oidcUserManager.signinRedirectCallback()
  return callbackPromise
}

interface ProfileState {
  key: string | null
  profile: Me | null
  error: string | null
}

const emptyProfileState: ProfileState = {
  key: null,
  profile: null,
  error: null,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profileState, setProfileState] =
    useState<ProfileState>(emptyProfileState)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const issuer = user?.profile.iss ?? null
  const subject = user?.profile.sub ?? null

  const profileKey =
    issuer && subject ? `${issuer}\u0000${subject}` : null

  const isProfileLoading =
    profileKey !== null && profileState.key !== profileKey

  const profile =
    profileKey !== null && profileState.key === profileKey
      ? profileState.profile
      : null

  const profileError =
    profileKey !== null && profileState.key === profileKey
      ? profileState.error
      : null

  useEffect(() => {
    let active = true

    const handleUserLoaded = (loadedUser: User) => {
      if (active) setUser(loadedUser)
    }

    const handleUserUnloaded = () => {
      void invalidateTokenSession()

      if (active) {
        setUser(null)
        setProfileState(emptyProfileState)
      }
    }

    oidcUserManager.events.addUserLoaded(handleUserLoaded)
    oidcUserManager.events.addUserUnloaded(handleUserUnloaded)

    async function initialize() {
      try {
        if (window.location.pathname === '/auth/callback') {
          const authenticatedUser = await processSigninCallback()

          if (!active) return

          await activateTokenSession()

          if (!active) return

          callbackPromise = null
          window.history.replaceState({}, document.title, '/')
          setUser(authenticatedUser)
        } else {
          const existingUser = await oidcUserManager.getUser()

          if (!active) return

          if (existingUser) {
            await activateTokenSession()
          }

          if (active) setUser(existingUser)
        }
      } catch {
        callbackPromise = null

        if (active) {
          setError('Sign-in could not be completed. Please try again.')
          window.history.replaceState({}, document.title, '/')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void initialize()

    return () => {
      active = false
      oidcUserManager.events.removeUserLoaded(handleUserLoaded)
      oidcUserManager.events.removeUserUnloaded(handleUserUnloaded)
    }
  }, [])

  useEffect(() => {
    if (!issuer || !subject || !profileKey) return

    let active = true

    async function loadProfile() {
      try {
        const currentProfile = await getCurrentProfile()

        if (active) {
          setProfileState({
            key: profileKey,
            profile: currentProfile,
            error: null,
          })
        }
      } catch {
        if (active) {
          setProfileState({
            key: profileKey,
            profile: null,
            error: 'Unable to load your account profile. Please try again.',
          })
        }
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [issuer, subject, profileKey])

  async function signIn() {
    setError(null)

    try {
      await oidcUserManager.signinRedirect()
    } catch {
      setError('Unable to start sign-in. Please try again.')
    }
  }

  async function signOut() {
    setError(null)
    setProfileState(emptyProfileState)

    await invalidateTokenSession()

    try {
      await oidcUserManager.signoutRedirect()
    } catch {
      await oidcUserManager.removeUser()
      setUser(null)
      setProfileState(emptyProfileState)
      setError('Local session cleared, but the identity provider sign-out failed.')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isProfileLoading,
        error,
        profileError,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
