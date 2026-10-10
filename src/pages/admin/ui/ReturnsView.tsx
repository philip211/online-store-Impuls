import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Link } from 'react-router'

import { formatDateTime } from '@/entities/order'
import { isApiError } from '@/shared/api'
import { routes } from '@/shared/config'
import { pluralize, toast } from '@/shared/lib'
import { Button, Chip, ChipGroup } from '@/shared/ui'

import { adminApi, adminQueries, type AdminReturn, type ReturnStatus } from '../api/admin-api'
import { RETURN_ACTIONS, RETURN_REASONS, RETURN_STATUS_LABELS } from '../model/labels'
import { useListParams } from '../model/use-list-params'
import s from './admin.module.css'
import { ListSkeleton, LoadError, Pager } from './parts'

const RETURN_FORMS = ['заявка', 'заявки', 'заявок'] as const
const STATUSES = Object.keys(RETURN_STATUS_LABELS) as ReturnStatus[]
const isStatus = (v: string): v is ReturnStatus => v in RETURN_STATUS_LABELS

function ReturnActions({ item }: { item: AdminReturn }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (to: ReturnStatus) => adminApi.updateReturn(item.id, { status: to }),
    onSuccess: (_, to) => {
      toast(`Заявка ${item.ref}: ${RETURN_STATUS_LABELS[to].toLowerCase()}`)
      document.getElementById('returns-title')?.focus()
      void queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (e) => toast(isApiError(e) ? e.detail : 'Не получилось сменить статус'),
  })
  const actions = RETURN_ACTIONS[item.status]
  if (!actions.length) return <span className={s.muted}>—</span>

  return (
    <div className={s.actions}>
      {actions.map((a, i) => (
        <Button
          key={a.to}
          size="sm"
          variant={i === 0 ? 'primary' : 'secondary'}
          loading={mutation.isPending && mutation.variables === a.to}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(a.to)}
        >
          {a.label}
        </Button>
      ))}
    </div>
  )
}

export function ReturnsView() {
  const { get, page, set } = useListParams()
  const raw = get('status')
  const status = isStatus(raw) ? raw : undefined
  const { data, isError, isPlaceholderData } = useQuery(
    adminQueries.returns({ page, limit: 20, status }),
  )

  return (
    <section aria-labelledby="returns-title">
      <title>Возвраты — управление Импульсом</title>
      <h2 id="returns-title" className={clsx(s.h2, s.chips)} tabIndex={-1}>
        Возвраты
      </h2>
      <p className={clsx(s.muted, s.chips)}>
        Деньги за возвращённый товар отправляйте в личном кабинете платёжного сервиса, затем
        закрывайте заявку.
      </p>
      <ChipGroup role="group" aria-label="Статус заявок" className={s.chips}>
        <Chip active={!status} onClick={() => set({ status: null })}>
          Все
        </Chip>
        {STATUSES.map((st) => (
          <Chip key={st} active={status === st} onClick={() => set({ status: st })}>
            {RETURN_STATUS_LABELS[st]}
          </Chip>
        ))}
      </ChipGroup>

      {isError && <LoadError />}
      {!data && !isError && <ListSkeleton rows={3} />}
      {data?.items.length === 0 && <p className={s.empty}>Заявок нет.</p>}

      {data && data.items.length > 0 && (
        <div
          className={clsx(s.tableWrap, isPlaceholderData && s.busy)}
          // Scrolls sideways on phones: focusable and named so the keyboard can scroll it too.
          tabIndex={0}
          role="region"
          aria-labelledby="returns-title"
          aria-busy={isPlaceholderData || undefined}
        >
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Заявка</th>
                <th scope="col">Заказ</th>
                <th scope="col">Причина</th>
                <th scope="col">Статус</th>
                <th scope="col">Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className={s.cellMain}>{r.ref}</span>
                    <span className={s.cellMeta}>{formatDateTime(r.createdAt)}</span>
                  </td>
                  <td>
                    <Link
                      to={routes.adminOrder(r.orderNumber)}
                      viewTransition
                      className={s.rowLink}
                    >
                      {r.orderNumber}
                    </Link>
                  </td>
                  <td>{RETURN_REASONS[r.reason] ?? r.reason}</td>
                  <td className={s.nowrap}>{RETURN_STATUS_LABELS[r.status]}</td>
                  <td>
                    <ReturnActions item={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager meta={data?.meta} noun={(n) => pluralize(n, RETURN_FORMS)} />
    </section>
  )
}
