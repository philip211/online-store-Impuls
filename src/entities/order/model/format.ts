import { formatDate } from '@/shared/lib'

/** "9 октября 2026, 14:05": admin lists need the year and the time. */
export function formatDateTime(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${formatDate(d)} ${d.getFullYear()}, ${time}`
}

/** "9 октября" this year, "9 октября 2025" otherwise. */
export function formatOrderDate(iso: string, now = new Date()) {
  const d = new Date(iso)
  return d.getFullYear() === now.getFullYear()
    ? formatDate(d)
    : `${formatDate(d)} ${d.getFullYear()}`
}
