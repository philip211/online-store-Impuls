import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'

import { formatDateTime } from '@/entities/order'
import { pluralize } from '@/shared/lib'

import { adminQueries } from '../api/admin-api'
import { AUDIT_ACTIONS } from '../model/labels'
import { useListParams } from '../model/use-list-params'
import s from './admin.module.css'
import { ListSkeleton, LoadError, Pager } from './parts'

const ENTRY_FORMS = ['запись', 'записи', 'записей'] as const

/** "from → to" for status-like changes, otherwise compact JSON. */
function describe(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const d = data as Record<string, unknown>
  if ('from' in d && 'to' in d) return `${String(d.from)} → ${String(d.to)}`
  return JSON.stringify(d)
}

export function AuditView() {
  const { page } = useListParams()
  const { data, isError, isPlaceholderData } = useQuery(adminQueries.audit({ page, limit: 30 }))

  return (
    <section aria-labelledby="audit-title">
      <title>Журнал — управление Импульсом</title>
      <h2 id="audit-title" className={clsx(s.h2, s.chips)}>
        Журнал
      </h2>
      <p className={clsx(s.muted, s.chips)}>Кто из сотрудников что менял — новые сверху.</p>

      {isError && <LoadError />}
      {!data && !isError && <ListSkeleton />}
      {data?.items.length === 0 && <p className={s.empty}>Записей пока нет.</p>}

      {data && data.items.length > 0 && (
        <div
          className={clsx(s.tableWrap, isPlaceholderData && s.busy)}
          // Scrolls sideways on phones: focusable and named so the keyboard can scroll it too.
          tabIndex={0}
          role="region"
          aria-labelledby="audit-title"
          aria-busy={isPlaceholderData || undefined}
        >
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Когда</th>
                <th scope="col">Кто</th>
                <th scope="col">Действие</th>
                <th scope="col">Подробности</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((e) => (
                <tr key={e.id}>
                  <td className={s.nowrap}>{formatDateTime(e.createdAt)}</td>
                  <td>{e.actorEmail ?? '—'}</td>
                  <td>
                    <span className={s.cellMain}>{AUDIT_ACTIONS[e.action] ?? e.action}</span>
                    <span className={s.cellMeta}>
                      {e.entity} {e.entityId}
                    </span>
                  </td>
                  <td>
                    <span className={s.code}>{describe(e.data)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager meta={data?.meta} noun={(n) => pluralize(n, ENTRY_FORMS)} />
    </section>
  )
}
