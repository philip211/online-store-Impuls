import { useEffect, useId, useState, type FormEvent } from 'react'

import type { Product } from '@/entities/product'
import { Button, CheckIcon, TextField } from '@/shared/ui'

import {
  useNotifyRestock,
  useRestockRequest,
  useRestockStore,
  validateEmail,
} from '../model/restock'
import s from './notify-restock.module.css'

type NotifyRestockFormProps = {
  product: Pick<Product, 'id' | 'name'>
  /** Lets the page's sticky bar move focus to the field. */
  inputId?: string
}

/** Waitlist for an item that is out of stock. One letter when it is back, nothing else. */
export function NotifyRestockForm({ product, inputId }: NotifyRestockFormProps) {
  const requested = useRestockRequest(product.id)
  const cancel = useRestockStore((st) => st.cancel)
  const mutation = useNotifyRestock()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | undefined>()
  // Changing the address keeps the current request until a new one is sent.
  const [editing, setEditing] = useState(false)
  const autoId = useId()
  const fieldId = inputId ?? autoId

  useEffect(() => {
    if (editing) document.getElementById(fieldId)?.focus()
  }, [editing, fieldId])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const check = validateEmail(value)
    if (!check.ok) {
      setError(check.error)
      return
    }
    setError(undefined)
    // The hook saves the new address over the old one on success.
    mutation.mutate(
      { productId: product.id, email: check.email },
      { onSuccess: () => setEditing(false) },
    )
  }

  return (
    <div className={s.box} aria-live="polite">
      {requested && !editing ? (
        <div className={s.done}>
          <p className={s.doneText}>
            <span className={s.doneIcon} aria-hidden="true">
              <CheckIcon size={16} />
            </span>
            <span>
              Напишем на <b>{requested}</b>, когда {product.name} снова появится.
            </span>
          </p>
          <div className={s.links}>
            <button
              type="button"
              className={s.link}
              onClick={() => {
                setValue(requested)
                setError(undefined)
                setEditing(true)
              }}
            >
              Изменить почту
            </button>
            <button type="button" className={s.link} onClick={() => cancel(product.id)}>
              Отписаться
            </button>
          </div>
        </div>
      ) : (
        <form className={s.form} onSubmit={onSubmit} noValidate>
          <p className={s.lead}>
            {requested ? (
              <>
                Укажите другую почту — подписка на <b>{requested}</b> сохранится, пока вы не
                отправите новую.
              </>
            ) : (
              'Сейчас этого товара нет. Оставьте почту — напишем один раз, когда он появится.'
            )}
          </p>
          <TextField
            id={fieldId}
            label="Электронная почта"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.ru"
            value={value}
            error={error}
            onChange={(e) => {
              setValue(e.target.value)
              if (error) setError(undefined)
            }}
          />
          <Button type="submit" wide loading={mutation.isPending} disabled={mutation.isPending}>
            Сообщить о поступлении
          </Button>
          {requested && (
            <button type="button" className={s.cancel} onClick={() => setEditing(false)}>
              Оставить {requested}
            </button>
          )}
          {mutation.isError && (
            <p className={s.error} role="alert">
              Не получилось отправить. Попробуйте ещё раз.
            </p>
          )}
        </form>
      )}
    </div>
  )
}
