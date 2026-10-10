import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import { sessionApi } from '@/entities/session'
import { formatPhone, phoneDigits } from '@/shared/lib'
import { Alert, Button, TextField } from '@/shared/ui'

import { authError, registerSchema, type RegisterValues } from '../model/schemas'
import s from './auth.module.css'
import { PasswordField } from './PasswordField'

export function RegisterForm({ onDone }: { onDone: () => void }) {
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '' },
    mode: 'onTouched',
  })
  const mutation = useMutation({ mutationFn: sessionApi.register, onSuccess: onDone })
  const { errors } = form.formState

  const submit = form.handleSubmit(({ phone, ...values }) =>
    mutation.mutate({ ...values, phone: phoneDigits(phone) ? phone : undefined }),
  )

  return (
    <form className={s.form} noValidate onSubmit={submit}>
      <TextField
        label="Имя"
        autoComplete="name"
        error={errors.name?.message}
        {...form.register('name')}
      />
      <TextField
        label="Почта"
        type="email"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        error={errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Телефон — по желанию, подставим в заказ"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+7 900 000-00-00"
        error={errors.phone?.message}
        {...form.register('phone', {
          onChange: (e: { target: HTMLInputElement }) =>
            form.setValue('phone', formatPhone(e.target.value)),
        })}
      />
      <PasswordField
        label="Пароль"
        autoComplete="new-password"
        hint="От 8 символов, хотя бы одна буква и одна цифра"
        error={errors.password?.message}
        {...form.register('password')}
      />
      {mutation.isError && <Alert>{authError(mutation.error)}</Alert>}
      <Button type="submit" wide loading={mutation.isPending} disabled={mutation.isPending}>
        Создать аккаунт
      </Button>
    </form>
  )
}
