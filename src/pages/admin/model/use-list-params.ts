import { useSearchParams } from 'react-router'

/**
 * List filters live in the URL (?q=&status=&page=), like the catalogue: a filtered list can
 * be shared with a colleague and survives a reload. Changing a filter goes back to page 1.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams()
  const get = (key: string) => params.get(key) ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const set = (patch: Record<string, string | number | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === '') next.delete(key)
          else next.set(key, String(value))
        }
        if (!('page' in patch)) next.delete('page')
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  return { get, page, set }
}
