import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import { sessionApi } from '@/entities/session'
import { Alert, Button, TextField } from '@/shared/ui'

import { authError, loginSchema, type LoginValues } from '../model/schemas'
import s from './auth.module.css'
import { PasswordField } from './PasswordField'

export function LoginForm({ onDone }: { onDone: () => void }) {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  })
  const mutation = useMutation({ mutationFn: sessionApi.login, onSuccess: onDone })
  const { errors } = form.formState

  return (
    <form
      className={s.form}
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <TextField
        label="Почта"
        type="email"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        error={errors.email?.message}
        {...form.register('email')}
      />
      <PasswordField
        label="Пароль"
        autoComplete="current-password"
        error={errors.password?.message}
        {...form.register('password')}
      />
      {mutation.isError && <Alert>{authError(mutation.error)}</Alert>}
      <Button type="submit" wide loading={mutation.isPending} disabled={mutation.isPending}>
        Войти
      </Button>
    </form>
  )
}
