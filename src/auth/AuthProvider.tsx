import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from 'oidc-client-ts'
import { AuthContext } from './AuthContext'
import { oidcUserManager } from './oidc'

let callbackPromise: Promise<User> | null = null

function processSigninCallback(): Promise<User> {
  callbackPromise ??= oidcUserManager.signinRedirectCallback()
  return callbackPromise
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const handleUserLoaded = (loadedUser: User) => {
      if (active) setUser(loadedUser)
    }

    const handleUserUnloaded = () => {
      if (active) setUser(null)
    }

    oidcUserManager.events.addUserLoaded(handleUserLoaded)
    oidcUserManager.events.addUserUnloaded(handleUserUnloaded)

    async function initialize() {
      try {
        if (window.location.pathname === '/auth/callback') {
          const authenticatedUser = await processSigninCallback()

          if (!active) return

          callbackPromise = null
          window.history.replaceState({}, document.title, '/')
          setUser(authenticatedUser)
        } else {
          const existingUser = await oidcUserManager.getUser()

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

    try {
      await oidcUserManager.signoutRedirect()
    } catch {
      await oidcUserManager.removeUser()
      setUser(null)
      setError('Local session cleared, but the identity provider sign-out failed.')
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, error, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}
