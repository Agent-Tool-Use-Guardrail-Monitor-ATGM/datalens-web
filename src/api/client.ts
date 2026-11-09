
export interface ApiError {
  code: string
  message: string
  request_id: string
  details: Record<string, unknown>
}

export class ApiRequestError extends Error {
  code: string
  requestId: string
  status: number
  details: Record<string, unknown>

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

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response

  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      cache: 'no-store',
      headers,
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiNetworkError()
    }

    throw error
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (
      data &&
      typeof data.code === 'string' &&
      typeof data.message === 'string' &&
      typeof data.request_id === 'string' &&
      typeof data.details === 'object' &&
      data.details !== null &&
      !Array.isArray(data.details)
    ) {
      throw new ApiRequestError(response.status, data as ApiError)
    }

    throw new Error(`Request failed with status ${response.status}`)
  }

  return data as T
}
