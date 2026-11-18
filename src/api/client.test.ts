
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../auth/token', () => ({
  getAccessToken: vi.fn(),
}))

import { getAccessToken } from '../auth/token'
import {
  apiRequest,
  ApiNetworkError,
  ApiRequestError,
} from './client'

const mockedGetAccessToken = vi.mocked(getAccessToken)

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
    vi.stubGlobal('fetch', vi.fn())
    mockedGetAccessToken.mockReset()
    mockedGetAccessToken.mockResolvedValue('test-access-token')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sends the Bearer token to the configured API URL', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 1 }))

    const result = await apiRequest<{ id: number }>('/auth/me')

    expect(result).toEqual({ id: 1 })
    expect(fetch).toHaveBeenCalledWith(
      new URL('http://localhost:8000/auth/me'),
      expect.objectContaining({
        credentials: 'omit',
        cache: 'no-store',
        headers: expect.any(Headers),
      }),
    )

    const requestOptions = vi.mocked(fetch).mock.calls[0][1]
    const headers = new Headers(requestOptions?.headers)

    expect(headers.get('Authorization')).toBe(
      'Bearer test-access-token',
    )
  })

  it('sets JSON content type when sending a JSON body', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true }))

    await apiRequest('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: 'Sales' }),
    })

    const requestOptions = vi.mocked(fetch).mock.calls[0][1]
    const headers = new Headers(requestOptions?.headers)

    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('refreshes the token and retries a GET request once after 401', async () => {
    mockedGetAccessToken
      .mockResolvedValueOnce('old-token')
      .mockResolvedValueOnce('new-token')

    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({ id: 1 }))

    const result = await apiRequest<{ id: number }>('/auth/me')

    expect(result).toEqual({ id: 1 })
    expect(getAccessToken).toHaveBeenCalledTimes(2)
    expect(getAccessToken).toHaveBeenNthCalledWith(2, true)
    expect(fetch).toHaveBeenCalledTimes(2)

    const retryOptions = vi.mocked(fetch).mock.calls[1][1]
    const retryHeaders = new Headers(retryOptions?.headers)

    expect(retryHeaders.get('Authorization')).toBe('Bearer new-token')
  })

  it('does not retry a POST request after 401', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ message: 'Unauthorized' }, 401),
    )

    await expect(
      apiRequest('/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: 'Sales' }),
      }),
    ).rejects.toThrow('Request failed with status 401')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(getAccessToken).toHaveBeenCalledTimes(1)
  })

  it('converts a valid structured API error into ApiRequestError', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          code: 'validation_error',
          message: 'The request is invalid.',
          request_id: 'request-123',
          details: [
            {
              location: ['body', 'title'],
              code: 'missing',
            },
          ],
        },
        422,
      ),
    )

    try {
      await apiRequest('/conversations', { method: 'POST' })
      throw new Error('Expected the request to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError)

      if (error instanceof ApiRequestError) {
        expect(error.status).toBe(422)
        expect(error.code).toBe('validation_error')
        expect(error.requestId).toBe('request-123')
        expect(error.details[0].code).toBe('missing')
      }
    }
  })

  it('handles malformed API errors', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ unexpected: 'response' }, 500),
    )

    await expect(apiRequest('/auth/me')).rejects.toThrow(
      'Request failed with status 500',
    )
  })

  it('returns undefined for a 204 response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 204 }),
    )

    const result = await apiRequest<void>('/datasets/1', {
      method: 'DELETE',
    })

    expect(result).toBeUndefined()
  })

  it('converts network failures into ApiNetworkError', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Network failure'))

    await expect(apiRequest('/auth/me')).rejects.toBeInstanceOf(
      ApiNetworkError,
    )
  })
})
