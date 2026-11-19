import { createContext } from 'react'
import type { User } from 'oidc-client-ts'
import type { Me } from './profile'

export interface AuthContextValue {
  user: User | null
  profile: Me | null
  isLoading: boolean
  isProfileLoading: boolean
  error: string | null
  profileError: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
