import { BlockList, isIPv4, isIPv6 } from 'node:net'

/** Addresses ЮKassa sends notifications from (https://yookassa.ru/developers/using-api/webhooks). */
const YOOKASSA_NETWORKS: [string, number, 'ipv4' | 'ipv6'][] = [
  ['185.71.76.0', 27, 'ipv4'],
  ['185.71.77.0', 27, 'ipv4'],
  ['77.75.153.0', 25, 'ipv4'],
  ['77.75.154.128', 25, 'ipv4'],
  ['2a02:5180::', 32, 'ipv6'],
]
const YOOKASSA_HOSTS = ['77.75.156.11', '77.75.156.35']

const list = new BlockList()
for (const [net, prefix, type] of YOOKASSA_NETWORKS) list.addSubnet(net, prefix, type)
for (const host of YOOKASSA_HOSTS) list.addAddress(host, 'ipv4')

export function isYooKassaAddress(ip: string | undefined): boolean {
  if (!ip) return false
  // IPv4 clients may appear as IPv4-mapped IPv6 (::ffff:185.71.76.1).
  const addr = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  if (isIPv4(addr)) return list.check(addr, 'ipv4')
  if (isIPv6(addr)) return list.check(addr, 'ipv6')
  return false
}
