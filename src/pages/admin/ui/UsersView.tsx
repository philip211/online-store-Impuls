import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import clsx from 'clsx'

import { formatOrderDate } from '@/entities/order'
import { useUser, type Role, type User } from '@/entities/session'
import { isApiError } from '@/shared/api'
import { formatPhone, pluralize, toast } from '@/shared/lib'
import { Button, Select } from '@/shared/ui'

import { adminApi, adminQueries } from '../api/admin-api'
import { ROLE_LABELS } from '../model/labels'
import { useListParams } from '../model/use-list-params'
import s from './admin.module.css'
import { ListSkeleton, LoadError, Pager, SearchField } from './parts'

const USER_FORMS = ['пользователь', 'пользователя', 'пользователей'] as const
const ROLES = Object.keys(ROLE_LABELS) as Role[]
const isRole = (v: string): v is Role => v in ROLE_LABELS

function RoleSelect({ user, self }: { user: User; self: boolean }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (role: Role) => adminApi.changeRole(user.id, role),
    onSuccess: (saved) => {
      toast(`${saved.name}: ${ROLE_LABELS[saved.role].toLowerCase()}. Нужно войти заново`)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })
    },
    onError: (e) => toast(isApiError(e) ? e.detail : 'Не получилось сменить роль'),
  })

  // Choose first, then confirm with the button: arrow keys on a closed select fire a change
  // per option on some systems, which must not trigger a role change each time.
  const [picked, setPicked] = useState<Role>(user.role)
  const apply = () => {
    const sure = window.confirm(
      `Сделать ${user.name} — «${ROLE_LABELS[picked]}»? Пользователю придётся войти заново.`,
    )
    if (sure) mutation.mutate(picked)
    else setPicked(user.role)
  }

  return (
    <div className={s.roleCell}>
      <Select
        label={`Роль: ${user.name}`}
        hideLabel
        value={picked}
        disabled={mutation.isPending || self}
        title={self ? 'Свою роль менять нельзя' : undefined}
        onChange={(e) => isRole(e.target.value) && setPicked(e.target.value)}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </Select>
      {picked !== user.role && (
        <Button
          size="sm"
          loading={mutation.isPending}
          disabled={mutation.isPending}
          onClick={apply}
        >
          Сменить
        </Button>
      )}
    </div>
  )
}

export function UsersView() {
  const me = useUser()
  const { get, page, set } = useListParams()
  const role = get('role')
  const { data, isError, isPlaceholderData } = useQuery(
    adminQueries.users({
      page,
      limit: 25,
      q: get('q') || undefined,
      role: isRole(role) ? role : undefined,
    }),
  )

  return (
    <section aria-labelledby="users-title">
      <title>Пользователи — управление Импульсом</title>
      <h2 id="users-title" className={clsx(s.h2, s.chips)}>
        Пользователи
      </h2>
      <div className={s.toolbar}>
        <SearchField label="Поиск" placeholder="Имя, почта или телефон" />
        <Select
          className={s.toolbarSelect}
          label="Роль"
          value={isRole(role) ? role : ''}
          onChange={(e) => set({ role: e.target.value })}
        >
          <option value="">Все роли</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </div>

      {isError && <LoadError />}
      {!data && !isError && <ListSkeleton />}
      {data?.items.length === 0 && <p className={s.empty}>Никого не нашли.</p>}

      {data && data.items.length > 0 && (
        <div
          className={clsx(s.tableWrap, isPlaceholderData && s.busy)}
          // Scrolls sideways on phones: focusable and named so the keyboard can scroll it too.
          tabIndex={0}
          role="region"
          aria-labelledby="users-title"
          aria-busy={isPlaceholderData || undefined}
        >
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Пользователь</th>
                <th scope="col">Телефон</th>
                <th scope="col">С нами с</th>
                <th scope="col">Роль</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className={s.cellMain}>{u.name}</span>
                    <span className={s.cellMeta}>{u.email}</span>
                  </td>
                  <td className={s.nowrap}>{u.phone ? formatPhone(u.phone) : '—'}</td>
                  <td className={s.nowrap}>{formatOrderDate(u.createdAt)}</td>
                  <td>
                    <RoleSelect key={`${u.id}:${u.role}`} user={u} self={u.id === me?.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager meta={data?.meta} noun={(n) => pluralize(n, USER_FORMS)} />
    </section>
  )
}
