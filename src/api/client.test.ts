
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, ApiNetworkError } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('returns data from a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    const result = await apiRequest<{ message: string }>('/api/test')

    expect(result.message).toBe('Success')
    expect(fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        credentials: 'same-origin',
        cache: 'no-store',
      }),
    )
  })

  it('handles the shared backend error structure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'ACCESS_DENIED',
            message: 'You do not have permission.',
            request_id: 'test-123',
            details: {},
          }),
          { status: 403 },
        ),
      ),
    )

    await expect(apiRequest('/api/test')).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 403,
      code: 'ACCESS_DENIED',
      requestId: 'test-123',
    })
  })

  it('handles network connection failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await expect(apiRequest('/api/test')).rejects.toBeInstanceOf(
      ApiNetworkError,
    )
  })

  it('handles responses with no content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    )

    const result = await apiRequest('/api/test')

    expect(result).toBeUndefined()
  })

  it('sets JSON Content-Type when sending a request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    })

    const requestOptions = fetchMock.mock.calls[0][1] as RequestInit

    expect(new Headers(requestOptions.headers).get('Content-Type')).toBe(
      'application/json',
    )
  })
it('handles malformed backend error responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('Internal server error', { status: 500 }),
      ),
    )

    await expect(apiRequest('/api/test')).rejects.toThrow(
      'Request failed with status 500',
    )
  })
})
