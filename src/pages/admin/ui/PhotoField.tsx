import clsx from 'clsx'
import { useId, useRef, useState, type ChangeEvent } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'

import { isApiError } from '@/shared/api'
import { Alert, Button, ChevronLeftIcon, CloseIcon, IconButton, Spinner, text } from '@/shared/ui'

import { adminApi } from '../api/admin-api'
import type { ProductFormValues } from '../model/product-form'
import s from './admin.module.css'

const ROLE_LABELS = { gallery: 'Деталь', context: 'В жизни' } as const

/**
 * Photos of a product: upload (several at once), pick the card photo, say which colour each
 * shows, describe it for screen readers, order the gallery. Files are processed by the API
 * into the catalogue's formats as soon as they are chosen.
 */
export function PhotoField() {
  const { control, register, setValue, getValues, formState } = useFormContext<ProductFormValues>()
  const { fields, append, remove, move } = useFieldArray({ control, name: 'photos' })
  const colors = useWatch({ control, name: 'colors' })
  const primary = useWatch({ control, name: 'primary' })
  const name = useWatch({ control, name: 'name' })
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const errors = formState.errors.photos

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!files.length) return
    setError(null)
    setUploading((n) => n + files.length)
    for (const file of files) {
      try {
        const uploaded = await adminApi.uploadPhoto(file)
        append({
          ...uploaded,
          role: 'gallery',
          color: getValues('colors')[0]?.name ?? '',
          alt: getValues('name'),
          focal: '50% 50%',
        })
      } catch (err) {
        setError(`${file.name}: ${isApiError(err) ? err.detail : 'не удалось загрузить'}`)
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  const drop = (index: number) => {
    remove(index)
    // Keep the card photo pointing at the same picture, or the first one.
    if (index === primary) setValue('primary', 0, { shouldDirty: true })
    else if (index < primary) setValue('primary', primary - 1, { shouldDirty: true })
  }

  const shift = (from: number, to: number) => {
    move(from, to)
    if (primary === from) setValue('primary', to, { shouldDirty: true })
    else if (primary === to) setValue('primary', from, { shouldDirty: true })
  }

  return (
    <div className={s.photoField}>
      {/* The card-photo radios form one group across the cards. */}
      <fieldset className={s.photoSet}>
        <legend className={text.srOnly}>Фото для карточки</legend>
        <ul className={s.photos}>
          {fields.map((field, i) => {
            const n = i + 1
            const colorError = errors?.[i]?.color?.message
            const altError = errors?.[i]?.alt?.message
            return (
              <li key={field.id} className={clsx(s.photoCard, i === primary && s.photoPrimary)}>
                <img src={field.src} alt="" className={s.photoImg} />
                <label className={s.primaryPick}>
                  <input
                    type="radio"
                    name="primary-photo"
                    checked={i === primary}
                    onChange={() => setValue('primary', i, { shouldDirty: true })}
                  />
                  {i === primary ? 'Фото для карточки' : 'Сделать фото карточки'}
                  <span className={text.srOnly}> — фото {n}</span>
                </label>

                <label className={s.miniField}>
                  <span>
                    Цвет на фото<span className={text.srOnly}> {n}</span>
                  </span>
                  <select
                    {...register(`photos.${i}.color`)}
                    className={clsx(s.miniSelect, colorError && s.miniBad)}
                    aria-invalid={colorError ? true : undefined}
                    aria-describedby={colorError ? `${inputId}-color-${i}` : undefined}
                  >
                    {colors.map((c, ci) => (
                      <option key={ci} value={c.name}>
                        {c.name || 'без названия'}
                      </option>
                    ))}
                  </select>
                </label>
                {i !== primary && (
                  <label className={s.miniField}>
                    <span>
                      Что показывает<span className={text.srOnly}> фото {n}</span>
                    </span>
                    <select {...register(`photos.${i}.role`)} className={s.miniSelect}>
                      <option value="gallery">{ROLE_LABELS.gallery}</option>
                      <option value="context">{ROLE_LABELS.context}</option>
                    </select>
                  </label>
                )}
                <label className={s.miniField}>
                  <span>
                    Описание для незрячих<span className={text.srOnly}>, фото {n}</span>
                  </span>
                  <input
                    {...register(`photos.${i}.alt`)}
                    placeholder={name ? `${name} на светлом фоне` : 'Что на фото'}
                    className={clsx(s.miniInput, altError && s.miniBad)}
                    aria-invalid={altError ? true : undefined}
                    aria-describedby={altError ? `${inputId}-alt-${i}` : undefined}
                  />
                </label>
                {colorError && (
                  <span id={`${inputId}-color-${i}`} className={s.miniError}>
                    {colorError}
                  </span>
                )}
                {altError && (
                  <span id={`${inputId}-alt-${i}`} className={s.miniError}>
                    {altError}
                  </span>
                )}

                <div className={s.photoTools}>
                  <IconButton
                    label={`Фото ${n}: раньше в галерее`}
                    disabled={i === 0}
                    onClick={() => shift(i, i - 1)}
                  >
                    <ChevronLeftIcon size={18} />
                  </IconButton>
                  <IconButton
                    label={`Фото ${n}: позже в галерее`}
                    disabled={i === fields.length - 1}
                    onClick={() => shift(i, i + 1)}
                  >
                    <ChevronLeftIcon size={18} className={s.flip} />
                  </IconButton>
                  <IconButton label={`Убрать фото ${n}`} onClick={() => drop(i)}>
                    <CloseIcon size={18} />
                  </IconButton>
                </div>
              </li>
            )
          })}

          {Array.from({ length: uploading }, (_, i) => (
            <li key={`up-${i}`} className={clsx(s.photoCard, s.photoLoading)} aria-busy="true">
              <Spinner />
              <span className={s.muted}>Обрабатываем фото…</span>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className={s.uploadRow}>
        {/* Opened by the button below; hidden from the tab order and from assistive tech. */}
        <input
          ref={fileRef}
          type="file"
          tabIndex={-1}
          aria-hidden="true"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className={s.fileInput}
          onChange={(e) => void onFiles(e)}
        />
        <Button
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading > 0}
        >
          {fields.length ? 'Добавить фото' : 'Загрузить фото'}
        </Button>
        <span className={s.muted}>
          JPEG, PNG, WebP или AVIF до 15 МБ. Лучше от 1600 px по ширине
        </span>
      </div>
      {error && <Alert>{error}</Alert>}
      {typeof errors?.message === 'string' && <Alert>{errors.message}</Alert>}
    </div>
  )
}
