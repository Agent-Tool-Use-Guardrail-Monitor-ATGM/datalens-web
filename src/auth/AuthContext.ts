import { createContext } from 'react'
import type { User } from 'oidc-client-ts'

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
