import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'

import { LoginForm, RegisterForm } from '@/features/auth'
import { useSessionStatus } from '@/entities/session'
import { Alert, Chip, ChipGroup, Container, text } from '@/shared/ui'

import { safeNext } from '../lib/safe-next'
import s from './login.module.css'

export function LoginPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const status = useSessionStatus()
  const { state } = useLocation()
  // A message from the page that sent us here, e.g. after a password change.
  const notice =
    state && typeof state === 'object' && 'notice' in state && typeof state.notice === 'string'
      ? state.notice
      : null
  const register = params.get('mode') === 'register'
  const next = safeNext(params.get('next'))

  const setMode = (mode: 'login' | 'register') =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (mode === 'register') p.set('mode', 'register')
        else p.delete('mode')
        return p
      },
      { replace: true, preventScrollReset: true },
    )

  // Already signed in (or just did): straight on.
  if (status === 'user') return <Navigate to={next} replace />
  const done = () => void navigate(next, { replace: true })

  return (
    <Container page className={s.page}>
      <title>{register ? 'Регистрация — Импульс' : 'Вход — Импульс'}</title>
      <div className={s.column}>
        <header className={s.head}>
          <h1 className={text.pageTitle}>{register ? 'Регистрация' : 'Вход'}</h1>
          <p className={s.lead}>
            Заказы, избранное и корзина — на всех ваших устройствах. Покупать можно и без аккаунта.
          </p>
        </header>

        <ChipGroup role="group" aria-label="Вход или регистрация" className={s.modes}>
          <Chip active={!register} onClick={() => setMode('login')}>
            У меня есть аккаунт
          </Chip>
          <Chip active={register} onClick={() => setMode('register')}>
            Я здесь впервые
          </Chip>
        </ChipGroup>

        {notice && <Alert tone="success">{notice}</Alert>}

        <div className={s.card}>
          {register ? (
            <RegisterForm key="register" onDone={done} />
          ) : (
            <LoginForm key="login" onDone={done} />
          )}
        </div>

        <p className={s.fine}>
          Пишем только о ваших заказах. Рассылка о новинках — отдельно и по согласию.
        </p>
      </div>
    </Container>
  )
}
