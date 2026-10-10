import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'

import { PasswordField, passwordRule } from '@/features/auth'
import { sessionApi, useUser, type User } from '@/entities/session'
import { isApiError } from '@/shared/api'
import { routes } from '@/shared/config'
import { formatPhone, phoneDigits } from '@/shared/lib'
import { Alert, Button, TextField } from '@/shared/ui'

import s from './account.module.css'

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Напишите, как к вам обращаться').max(80, 'Слишком длинное имя'),
  phone: z
    .string()
    .refine((v) => [0, 11].includes(phoneDigits(v).length), 'Нужно 11 цифр или пустое поле'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: passwordRule,
})

const errorText = (e: unknown) =>
  isApiError(e) && e.status < 500 ? e.detail : 'Не получилось сохранить. Попробуйте ещё раз.'

function ProfileForm({ user }: { user: User }) {
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, phone: user.phone ? formatPhone(user.phone) : '' },
    mode: 'onTouched',
  })
  const mutation = useMutation({
    mutationFn: sessionApi.updateProfile,
    onSuccess: (saved) =>
      form.reset({ name: saved.name, phone: saved.phone ? formatPhone(saved.phone) : '' }),
  })
  const { errors, isDirty } = form.formState

  return (
    <form
      className={s.form}
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <TextField
        label="Имя"
        autoComplete="name"
        error={errors.name?.message}
        {...form.register('name')}
      />
      <TextField
        label="Телефон — подставим при оформлении заказа"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+7 900 000-00-00"
        error={errors.phone?.message}
        {...form.register('phone', {
          onChange: (e: { target: HTMLInputElement }) =>
            form.setValue('phone', formatPhone(e.target.value), { shouldDirty: true }),
        })}
      />
      {mutation.isError && <Alert>{errorText(mutation.error)}</Alert>}
      <div className={s.formActions}>
        <Button
          type="submit"
          loading={mutation.isPending}
          disabled={mutation.isPending || !isDirty}
        >
          Сохранить
        </Button>
        {/* Mounted up front: a live region inserted already filled is often not read. */}
        <span className={s.saved} role="status">
          {mutation.isSuccess && !isDirty ? 'Сохранено' : ''}
        </span>
      </div>
    </form>
  )
}

function PasswordForm() {
  const navigate = useNavigate()
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
    mode: 'onTouched',
  })
  const mutation = useMutation({
    mutationFn: sessionApi.changePassword,
    // Every session ends with the old password, this one too: sign in with the new one.
    onSuccess: () =>
      void navigate(routes.login(routes.accountSettings()), {
        replace: true,
        state: { notice: 'Пароль изменён. Войдите с новым паролем.' },
      }),
  })
  const { errors } = form.formState

  return (
    <form
      className={s.form}
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <PasswordField
        label="Текущий пароль"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...form.register('currentPassword')}
      />
      <PasswordField
        label="Новый пароль"
        autoComplete="new-password"
        hint="От 8 символов, хотя бы одна буква и одна цифра"
        error={errors.newPassword?.message}
        {...form.register('newPassword')}
      />
      {mutation.isError && <Alert>{errorText(mutation.error)}</Alert>}
      <div className={s.formActions}>
        <Button
          type="submit"
          variant="secondary"
          loading={mutation.isPending}
          disabled={mutation.isPending}
        >
          Изменить пароль
        </Button>
      </div>
    </form>
  )
}

export function SettingsView() {
  const user = useUser()
  if (!user) return null

  return (
    <div>
      <title>Профиль — Импульс</title>
      <section className={s.block} aria-labelledby="profile-title">
        <h2 id="profile-title" className={s.h2}>
          Профиль
        </h2>
        <dl className={s.facts}>
          <div>
            <dt>Почта</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
        <ProfileForm user={user} />
      </section>

      <section className={s.block} aria-labelledby="password-title">
        <h2 id="password-title" className={s.h2}>
          Пароль
        </h2>
        <p className={s.muted}>После смены пароля выйдем из аккаунта на всех устройствах.</p>
        <PasswordForm />
      </section>
    </div>
  )
}
