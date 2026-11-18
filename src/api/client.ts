import { getAccessToken } from '../auth/token'

export interface ApiErrorDetail {
  location: Array<string | number>
  code: string
}

export interface ApiError {
  code: string
  message: string
  request_id: string
  details: ApiErrorDetail[]
}

export class ApiRequestError extends Error {
  code: string
  requestId: string
  status: number
  details: ApiErrorDetail[]

  constructor(status: number, error: ApiError) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = error.code
    this.requestId = error.request_id
    this.details = error.details
  }
}

export class ApiNetworkError extends Error {
  constructor() {
    super('Unable to connect to the server. Please try again.')
    this.name = 'ApiNetworkError'
  }
}

function getApiUrl(path: string): URL {
  const baseUrl = import.meta.env.VITE_API_BASE_URL

  if (!baseUrl) {
    throw new Error('API configuration is missing. Check VITE_API_BASE_URL.')
  }

  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('API requests must use a relative path.')
  }

  let base: URL
  let url: URL

  try {
    base = new URL(baseUrl)
    url = new URL(path, base)
  } catch {
    throw new Error('The API base URL is invalid.')
  }

  if (
    !['http:', 'https:'].includes(base.protocol) ||
    url.origin !== base.origin
  ) {
    throw new Error('The API request URL is invalid.')
  }

  return url
}

function isApiError(data: unknown): data is ApiError {
  if (!data || typeof data !== 'object') return false

  const error = data as Record<string, unknown>

  return (
    typeof error.code === 'string' &&
    typeof error.message === 'string' &&
    typeof error.request_id === 'string' &&
    Array.isArray(error.details) &&
    error.details.every((detail: unknown) => {
      if (!detail || typeof detail !== 'object') return false

      const item = detail as Record<string, unknown>

      return (
        typeof item.code === 'string' &&
        Array.isArray(item.location) &&
        item.location.every(
          (part: unknown) =>
            typeof part === 'string' || typeof part === 'number',
        )
      )
    })
  )
}

async function sendRequest(
  url: URL,
  options: RequestInit,
  token: string | null,
): Promise<Response> {
  const headers = new Headers(options.headers)

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  } else {
    headers.delete('Authorization')
  }

  try {
    return await fetch(url, {
      ...options,
      headers,
      credentials: 'omit',
      cache: 'no-store',
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiNetworkError()
    }

    throw error
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T
  }

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (isApiError(data)) {
      throw new ApiRequestError(response.status, data)
    }

    throw new Error(`Request failed with status ${response.status}`)
  }

  return data as T
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = getApiUrl(path)
  const method = (options.method ?? 'GET').toUpperCase()
  const token = await getAccessToken()

  let response = await sendRequest(url, options, token)

  const canSafelyRetry = ['GET', 'HEAD', 'OPTIONS'].includes(method)

  if (response.status === 401 && canSafelyRetry) {
    const refreshedToken = await getAccessToken(true)

    if (refreshedToken) {
      response = await sendRequest(url, options, refreshedToken)
    }
  }

  return handleResponse<T>(response)
}
