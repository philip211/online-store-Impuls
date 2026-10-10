import { api, ApiError, configureAuth } from './http'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const problem = (code: string, status: number) =>
  json({ code, detail: `detail of ${code}`, status }, status)

const authHeader = (call: unknown[]) =>
  ((call[1] as RequestInit).headers as Record<string, string>).Authorization

describe('api', () => {
  const fetchMock = vi.fn<typeof fetch>()
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('turns RFC 9457 problems into ApiError with the machine code', async () => {
    configureAuth({ token: () => null, refresh: () => Promise.resolve(null) })
    fetchMock.mockResolvedValueOnce(problem('OUT_OF_STOCK', 409))
    const error = await api('/orders', { method: 'POST', body: {} }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 409,
      code: 'OUT_OF_STOCK',
      detail: 'detail of OUT_OF_STOCK',
    })
  })

  it('renews an expired access token once and repeats the request', async () => {
    let token = 'old'
    const refresh = vi.fn(() => {
      token = 'new'
      return Promise.resolve(token)
    })
    configureAuth({ token: () => token, refresh })
    fetchMock
      .mockResolvedValueOnce(problem('UNAUTHORIZED', 401))
      .mockResolvedValueOnce(json({ ok: 1 }))

    await expect(api('/me')).resolves.toEqual({ ok: 1 })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(authHeader(fetchMock.mock.calls[0]!)).toBe('Bearer old')
    expect(authHeader(fetchMock.mock.calls[1]!)).toBe('Bearer new')
  })

  it('gives up when the session cannot be renewed', async () => {
    configureAuth({ token: () => 'old', refresh: () => Promise.resolve(null) })
    fetchMock.mockResolvedValueOnce(problem('UNAUTHORIZED', 401))
    await expect(api('/me')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends no token and never refreshes for anonymous calls', async () => {
    const refresh = vi.fn(() => Promise.resolve('x'))
    configureAuth({ token: () => 'old', refresh })
    fetchMock.mockResolvedValueOnce(problem('INVALID_CREDENTIALS', 401))
    await expect(api('/auth/login', { method: 'POST', anonymous: true })).rejects.toBeInstanceOf(
      ApiError,
    )
    expect(authHeader(fetchMock.mock.calls[0]!)).toBeUndefined()
    expect(refresh).not.toHaveBeenCalled()
  })
})
