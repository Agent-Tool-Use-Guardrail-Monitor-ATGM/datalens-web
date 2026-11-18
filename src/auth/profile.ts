import { apiRequest } from '../api/client'

export type Role = 'user' | 'admin'

export interface Profile {
  issuer: string
  subject: string
  display_name: string | null
  username: string | null
  email: string | null
  profile_updated_at: string
}

export interface MeBase {
  issuer: string
  subject: string
  roles: Role[]
  email_verified: true
}

export type Me = MeBase &
  (
    | {
        profile_status: 'synchronizing'
        profile: null
      }
    | {
        profile_status: 'ready'
        profile: Profile
      }
  )

export async function getCurrentProfile(): Promise<Me> {
  return apiRequest<Me>('/auth/me')
}
