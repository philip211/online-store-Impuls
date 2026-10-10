import { useId, useState, type ComponentProps } from 'react'

import { TextField } from '@/shared/ui'

import s from './auth.module.css'

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, 'type'>

/** A password input whose value can be shown: typos on phones are the usual reason logins fail. */
export function PasswordField({ id, ...props }: PasswordFieldProps) {
  const [shown, setShown] = useState(false)
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={s.secret}>
      <TextField {...props} id={inputId} type={shown ? 'text' : 'password'} />
      {/* A fixed name with a pressed state: "Показать пароль: Новый пароль, нажата". */}
      <button
        type="button"
        className={s.reveal}
        aria-pressed={shown}
        aria-controls={inputId}
        aria-label={`Показать пароль: ${props.label}`}
        onClick={() => setShown((v) => !v)}
      >
        {shown ? 'Скрыть' : 'Показать'}
      </button>
    </div>
  )
}
