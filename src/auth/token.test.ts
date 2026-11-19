import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from 'oidc-client-ts'

vi.mock('./oidc', () => ({
  oidcUserManager: {
    getUser: vi.fn(),
    signinSilent: vi.fn(),
    removeUser: vi.fn(),
  },
}))

import { oidcUserManager } from './oidc'
import {
  activateTokenSession,
  getAccessToken,
  invalidateTokenSession,
} from './token'

const mockedManager = vi.mocked(oidcUserManager)

function createUser(overrides: Partial<User> = {}): User {
  return {
    access_token: 'old-access-token',
    refresh_token: 'test-refresh-token',
    expired: false,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  } as User
}

describe('getAccessToken', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockedManager.removeUser.mockResolvedValue()
    await activateTokenSession()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the current token when it is still valid', async () => {
    mockedManager.getUser.mockResolvedValue(createUser())

    const token = await getAccessToken()

    expect(token).toBe('old-access-token')
    expect(mockedManager.signinSilent).not.toHaveBeenCalled()
  })

  it('refreshes a token that is about to expire', async () => {
    mockedManager.getUser.mockResolvedValue(
      createUser({
        expires_at: Math.floor(Date.now() / 1000) + 30,
      }),
    )
    mockedManager.signinSilent.mockResolvedValue(
      createUser({ access_token: 'new-access-token' }),
    )

    const token = await getAccessToken()

    expect(token).toBe('new-access-token')
    expect(mockedManager.signinSilent).toHaveBeenCalledTimes(1)
  })

  it('refreshes when forceRefresh is true', async () => {
    mockedManager.getUser.mockResolvedValue(createUser())
    mockedManager.signinSilent.mockResolvedValue(
      createUser({ access_token: 'refreshed-token' }),
    )

    const token = await getAccessToken(true)

    expect(token).toBe('refreshed-token')
    expect(mockedManager.signinSilent).toHaveBeenCalledTimes(1)
  })

  it('returns null when no user exists', async () => {
    mockedManager.getUser.mockResolvedValue(null)

    const token = await getAccessToken()

    expect(token).toBeNull()
    expect(mockedManager.signinSilent).not.toHaveBeenCalled()
  })

  it('clears the local user when no refresh token exists', async () => {
    mockedManager.getUser.mockResolvedValue(
      createUser({ refresh_token: undefined }),
    )

    const token = await getAccessToken(true)

    expect(token).toBeNull()
    expect(mockedManager.removeUser).toHaveBeenCalledTimes(1)
    expect(mockedManager.signinSilent).not.toHaveBeenCalled()
  })

  it('clears the local user when refresh fails', async () => {
    mockedManager.getUser.mockResolvedValue(createUser())
    mockedManager.signinSilent.mockRejectedValue(
      new Error('Refresh failed'),
    )

    const token = await getAccessToken(true)

    expect(token).toBeNull()
    expect(mockedManager.removeUser).toHaveBeenCalledTimes(1)
  })

  it('returns null when refresh produces no access token', async () => {
    mockedManager.getUser.mockResolvedValue(createUser())
    mockedManager.signinSilent.mockResolvedValue(
      createUser({ access_token: '' }),
    )

    const token = await getAccessToken(true)

    expect(token).toBeNull()
    expect(mockedManager.removeUser).toHaveBeenCalledTimes(1)
  })

  it('shares one refresh operation between concurrent requests', async () => {
    mockedManager.getUser.mockResolvedValue(createUser())

    let resolveRefresh!: (user: User) => void

    const refreshResult = new Promise<User>((resolve) => {
      resolveRefresh = resolve
    })

    mockedManager.signinSilent.mockReturnValue(refreshResult)

    const firstRequest = getAccessToken(true)
    const secondRequest = getAccessToken(true)

    await vi.waitFor(() => {
      expect(mockedManager.signinSilent).toHaveBeenCalledTimes(1)
    })

    resolveRefresh(createUser({ access_token: 'shared-new-token' }))

    const tokens = await Promise.all([firstRequest, secondRequest])

    expect(tokens).toEqual([
      'shared-new-token',
      'shared-new-token',
    ])
    expect(mockedManager.signinSilent).toHaveBeenCalledTimes(1)
  })

  it('rejects a refresh result when the session is invalidated during logout', async () => {
    mockedManager.getUser.mockResolvedValue(createUser())

    let resolveRefresh!: (user: User) => void

    const refreshResult = new Promise<User>((resolve) => {
      resolveRefresh = resolve
    })

    mockedManager.signinSilent.mockReturnValue(refreshResult)

    const tokenRequest = getAccessToken(true)

    await vi.waitFor(() => {
      expect(mockedManager.signinSilent).toHaveBeenCalledTimes(1)
    })

    const invalidation = invalidateTokenSession()

    resolveRefresh(createUser({ access_token: 'stale-token' }))

    await expect(tokenRequest).resolves.toBeNull()
    await invalidation

    // The old refresh must not remove a potentially newer local user.
    expect(mockedManager.removeUser).not.toHaveBeenCalled()
  })

  it('waits for an old refresh before activating a new session', async () => {
    mockedManager.getUser.mockResolvedValue(createUser())

    let resolveRefresh!: (user: User) => void

    const refreshResult = new Promise<User>((resolve) => {
      resolveRefresh = resolve
    })

    mockedManager.signinSilent.mockReturnValue(refreshResult)

    const oldTokenRequest = getAccessToken(true)

    await vi.waitFor(() => {
      expect(mockedManager.signinSilent).toHaveBeenCalledTimes(1)
    })

    const activation = activateTokenSession()

    resolveRefresh(createUser({ access_token: 'old-session-token' }))

    await expect(oldTokenRequest).resolves.toBeNull()
    await activation

    mockedManager.getUser.mockResolvedValue(
      createUser({ access_token: 'new-session-token' }),
    )

    await expect(getAccessToken()).resolves.toBe('new-session-token')
    expect(mockedManager.removeUser).not.toHaveBeenCalled()
  })
})
