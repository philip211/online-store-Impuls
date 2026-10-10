import { isYooKassaAddress } from './ip-allowlist'

describe('isYooKassaAddress', () => {
  it('accepts the provider networks, including IPv4-mapped IPv6', () => {
    expect(isYooKassaAddress('185.71.76.5')).toBe(true)
    expect(isYooKassaAddress('::ffff:77.75.153.100')).toBe(true)
    expect(isYooKassaAddress('77.75.156.11')).toBe(true)
    expect(isYooKassaAddress('2a02:5180:0:1::1')).toBe(true)
  })

  it('rejects everything else', () => {
    expect(isYooKassaAddress('185.71.76.32')).toBe(false)
    expect(isYooKassaAddress('127.0.0.1')).toBe(false)
    expect(isYooKassaAddress(undefined)).toBe(false)
    expect(isYooKassaAddress('garbage')).toBe(false)
  })
})
