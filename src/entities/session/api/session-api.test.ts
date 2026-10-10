import { useSessionStore } from '../model/session-store'
import { refreshSession, sessionApi } from './session-api'

const user = {
  id: 'u1',
  email: 'anna@test.ru',
  name: 'Анна',
  phone: null,
  role: 'CUSTOMER' as const,
  createdAt: '2026-10-01T00:00:00.000Z',
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

describe('session', () => {
  const fetchMock = vi.fn<typeof fetch>()
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    useSessionStore.setState({ status: 'unknown', user: null, accessToken: null })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('spends the rotating refresh cookie once for parallel callers', async () => {
    fetchMock.mockResolvedValue(ok({ accessToken: 't1', expiresIn: 900, user }))
    const tokens = await Promise.all([refreshSession(), refreshSession(), refreshSession()])
    expect(tokens).toEqual(['t1', 't1', 't1'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(useSessionStore.getState()).toMatchObject({ status: 'user', accessToken: 't1' })
  })

  it('becomes a guest without an error when there is no cookie (204)', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(refreshSession()).resolves.toBeNull()
    expect(useSessionStore.getState().status).toBe('guest')
  })

  it('becomes a guest when the API rejects the cookie', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: 'INVALID_REFRESH_TOKEN', detail: 'x' }), { status: 401 }),
    )
    await expect(refreshSession()).resolves.toBeNull()
    expect(useSessionStore.getState().status).toBe('guest')
  })

  it('stays as it was when the network is down', async () => {
    useSessionStore.setState({ status: 'user', user, accessToken: 'kept' })
    fetchMock.mockRejectedValue(new TypeError('offline'))
    await expect(refreshSession()).resolves.toBe('kept')
    expect(useSessionStore.getState().status).toBe('user')
  })

  it('keeps a live session when the API answers 5xx', async () => {
    useSessionStore.setState({ status: 'user', user, accessToken: 'kept' })
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: 'INTERNAL_ERROR' }), { status: 502 }),
    )
    await expect(refreshSession()).resolves.toBe('kept')
    expect(useSessionStore.getState().status).toBe('user')
  })

  it('does not leave the app waiting forever when opened offline', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    await refreshSession()
    // Guards stop waiting; the session is checked again once the network is back.
    expect(useSessionStore.getState().status).toBe('guest')
  })

  it('signs out locally even if the logout request fails', async () => {
    useSessionStore.setState({ status: 'user', user, accessToken: 't' })
    fetchMock.mockRejectedValue(new TypeError('offline'))
    await expect(sessionApi.logout()).rejects.toThrow('offline')
    expect(useSessionStore.getState()).toMatchObject({ status: 'guest', accessToken: null })
  })
})
