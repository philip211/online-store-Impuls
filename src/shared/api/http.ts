/**
 * Thin client for the store API (server/). In development Vite proxies /api to it, so the
 * storefront and the API share an origin; VITE_API_URL points elsewhere if they do not.
 */
export const API_URL: string = import.meta.env.VITE_API_URL ?? '/api/v1'

/** An RFC 9457 problem answered by the API. Branch on `code`, show `detail`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,
    /** The whole problem body: some codes carry extra data (e.g. fresh prices). */
    readonly body: Record<string, unknown>,
  ) {
    super(detail)
    this.name = 'ApiError'
  }
}

type Query = Record<string, string | number | boolean | null | undefined>

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Query
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  /** Auth endpoints themselves: no token, no refresh-and-retry. */
  anonymous?: boolean
}

/**
 * How requests learn about the signed-in user. The session entity plugs itself in at
 * startup (shared cannot import it): the token goes into `Authorization`, and a 401 on a
 * request that carried one triggers a single refresh and retry.
 */
type AuthHooks = {
  token: () => string | null
  /** Resolves with a fresh token, or null when the session is over. */
  refresh: () => Promise<string | null>
}

let auth: AuthHooks | null = null

export function configureAuth(hooks: AuthHooks) {
  auth = hooks
}

function url(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const search = params.toString()
  return `${API_URL}${path}${search ? `?${search}` : ''}`
}

function send(path: string, options: RequestOptions, token: string | null) {
  const { method = 'GET', query, body, headers, signal } = options
  // Files go as multipart: the browser sets the Content-Type with its boundary.
  const form = body instanceof FormData
  return fetch(url(path, query), {
    method,
    signal,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && !form ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: form ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.anonymous ? null : (auth?.token() ?? null)
  let res = await send(path, options, token)
  // The access token expired mid-session: renew it once and repeat the request.
  if (res.status === 401 && token && auth) {
    const fresh = await auth.refresh()
    if (fresh) res = await send(path, options, fresh)
  }
  if (res.status === 204) return undefined as T
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const problem = (data ?? {}) as Record<string, unknown>
    throw new ApiError(
      res.status,
      typeof problem.code === 'string' ? problem.code : 'HTTP_ERROR',
      typeof problem.detail === 'string' ? problem.detail : res.statusText,
      problem,
    )
  }
  return data as T
}

export const isApiError = (e: unknown, code?: string): e is ApiError =>
  e instanceof ApiError && (code === undefined || e.code === code)
