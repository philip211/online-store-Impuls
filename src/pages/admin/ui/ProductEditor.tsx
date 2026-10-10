import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { FormProvider, useFieldArray, useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { useNavigate } from 'react-router'

import { isApiError } from '@/shared/api'
import { routes } from '@/shared/config'
import { plural, toast } from '@/shared/lib'
import {
  Alert,
  Button,
  Checkbox,
  CloseIcon,
  IconButton,
  Select,
  TextArea,
  TextField,
  text,
} from '@/shared/ui'

import { adminApi, adminQueries, type AdminProduct, type ProductInput } from '../api/admin-api'
import { slugify } from '../lib/slug'
import {
  EMPTY_PRODUCT,
  productFormSchema,
  toFormValues,
  type ProductFormValues,
} from '../model/product-form'
import s from './admin.module.css'
import { PhotoField } from './PhotoField'

const FORM_ID = 'product-form'

/** API field path → form field path, so validation errors land on the right input. */
function formField(path: string): string {
  const [head = '', ...rest] = path.split('.')
  if (head === 'images') return ['photos', ...rest].join('.')
  // dimensions.size → size: the form keeps the three dimension fields flat.
  if (head === 'dimensions') return rest[0] ?? 'size'
  return path
}

/**
 * Photos refer to colours by name. When a colour is renamed or removed, its photos follow:
 * otherwise they would point at a colour the product no longer has and the form could not
 * be saved (picking the only remaining option fires no change event).
 */
function useColorRenames(form: UseFormReturn<ProductFormValues, unknown, ProductInput>) {
  const colors = useWatch({ control: form.control, name: 'colors' })
  const previous = useRef(colors.map((c) => c.name))
  useEffect(() => {
    const before = previous.current
    const after = colors.map((c) => c.name)
    previous.current = after
    const fallback = after.find(Boolean) ?? ''
    form.getValues('photos').forEach((photo, i) => {
      if (after.includes(photo.color)) return
      const was = before.indexOf(photo.color)
      // Same row renamed → follow it; row removed → first remaining colour.
      const next = was >= 0 && before.length === after.length ? (after[was] ?? fallback) : fallback
      if (next !== photo.color) form.setValue(`photos.${i}.color`, next, { shouldDirty: true })
    })
  }, [colors, form])
}

/** Every field error react-hook-form holds (each leaf has a `type`), nested arrays included. */
function countErrors(node: unknown): number {
  if (!node || typeof node !== 'object') return 0
  const own = 'type' in node && typeof node.type === 'string' ? 1 : 0
  const nested = Object.entries(node)
    .filter(([key]) => key !== 'ref' && key !== 'types')
    .reduce((n, [, value]) => n + countErrors(value), 0)
  return own + nested
}

/** "Проверьте 3 поля": counted, so the summary holds even when a field is out of view. */
function errorCount(errors: object): string {
  const n = Math.max(1, countErrors(errors))
  return `Проверьте ${n} ${plural(n, ['поле', 'поля', 'полей'])} — они отмечены красным.`
}

type ProductEditorProps = {
  /** Editing an existing product; without it the editor creates one. */
  product?: AdminProduct
}

export function ProductEditor({ product }: ProductEditorProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: categories } = useQuery(adminQueries.categories())
  const form = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? toFormValues(product) : EMPTY_PRODUCT,
    mode: 'onTouched',
  })
  const { register, control, formState, setValue, setError } = form
  const { errors, isDirty } = formState
  const colors = useFieldArray({ control, name: 'colors' })
  useColorRenames(form)
  const specs = useFieldArray({ control, name: 'specs' })
  // A new product's URL follows its name until someone edits the URL by hand.
  const [slugTouched, setSlugTouched] = useState(Boolean(product))
  const name = useWatch({ control, name: 'name' })

  const mutation = useMutation({
    mutationFn: (input: ProductInput) =>
      product ? adminApi.updateProduct(product.id, input) : adminApi.createProduct(input),
    onSuccess: (saved) => {
      queryClient.setQueryData(adminQueries.product(saved.id).queryKey, saved)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      // The storefront caches the catalogue too.
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      if (product) {
        form.reset(toFormValues(saved))
        toast('Сохранено. Витрина обновится в течение минуты')
      } else {
        toast(`«${saved.name}» добавлен в каталог`)
        void navigate(routes.adminProduct(saved.id), { replace: true })
      }
    },
    onError: (e) => {
      // Field errors from the API go next to their inputs.
      if (isApiError(e, 'VALIDATION_FAILED') && Array.isArray(e.body.errors)) {
        for (const err of e.body.errors as { field: string; message: string }[]) {
          setError(formField(err.field) as keyof ProductFormValues, { message: err.message })
        }
      }
      if (isApiError(e, 'CONFLICT')) setError('slug', { message: e.detail })
    },
  })

  const submitError =
    mutation.isError && !isApiError(mutation.error, 'VALIDATION_FAILED')
      ? isApiError(mutation.error)
        ? mutation.error.detail
        : 'Не получилось сохранить. Попробуйте ещё раз.'
      : null

  return (
    <FormProvider {...form}>
      <div className={s.columns}>
        <form
          id={FORM_ID}
          className={s.editor}
          noValidate
          onSubmit={form.handleSubmit((input) => mutation.mutate(input))}
        >
          <section className={s.block} aria-labelledby="ed-main">
            <h3 id="ed-main" className={s.h3}>
              Основное
            </h3>
            <div className={s.grid2}>
              <TextField
                label="Название"
                placeholder="Sony WH-1000XM5"
                error={errors.name?.message}
                {...register('name', {
                  onChange: (e: { target: HTMLInputElement }) => {
                    if (!slugTouched)
                      setValue('slug', slugify(e.target.value), { shouldValidate: true })
                  },
                })}
              />
              <TextField
                label="Адрес на сайте"
                placeholder={name ? slugify(name) : 'sony-wh-1000xm5'}
                spellCheck={false}
                error={errors.slug?.message}
                {...register('slug', { onChange: () => setSlugTouched(true) })}
              />
              <TextField
                label="Бренд"
                placeholder="Sony"
                error={errors.brand?.message}
                {...register('brand')}
              />
              <TextField
                label="Тип товара"
                placeholder="Наушники"
                error={errors.kind?.message}
                {...register('kind')}
              />
              <Select
                // Remount when the list arrives: an uncontrolled select ignores a value it had no
                // option for, and would show "Выберите раздел" for a product that has one.
                key={categories ? 'loaded' : 'loading'}
                label="Раздел"
                error={errors.categoryId?.message}
                {...register('categoryId')}
              >
                <option value="">Выберите раздел</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <TextArea
              label="Описание"
              rows={6}
              placeholder="Чем хорош, кому подойдёт, что в коробке"
              error={errors.description?.message}
              {...register('description')}
            />
          </section>

          <section className={s.block} aria-labelledby="ed-price">
            <h3 id="ed-price" className={s.h3}>
              Цена и наличие
            </h3>
            <div className={s.grid3}>
              <TextField
                label="Цена, ₽"
                inputMode="numeric"
                error={errors.price?.message}
                {...register('price')}
              />
              <TextField
                label="До скидки, ₽"
                inputMode="numeric"
                placeholder="Нет скидки"
                error={errors.oldPrice?.message}
                {...register('oldPrice')}
              />
              <TextField
                label="Остаток, шт."
                inputMode="numeric"
                error={errors.stock?.message}
                {...register('stock')}
              />
            </div>
          </section>

          <section className={s.block} aria-labelledby="ed-variants">
            <h3 id="ed-variants" className={s.h3}>
              Цвета и варианты
            </h3>
            <ul className={s.editRows}>
              {colors.fields.map((field, i) => (
                <li key={field.id} className={s.colorRow}>
                  <TextField
                    label={i === 0 ? 'Цвет' : `Цвет ${i + 1}`}
                    placeholder="Платиновый серебристый"
                    error={errors.colors?.[i]?.name?.message}
                    {...register(`colors.${i}.name`)}
                  />
                  <label className={s.swatch}>
                    <span className={text.srOnly}>Оттенок цвета {i + 1}</span>
                    <input type="color" {...register(`colors.${i}.hex`)} />
                  </label>
                  <IconButton
                    label={`Убрать цвет ${i + 1}`}
                    disabled={colors.fields.length === 1}
                    onClick={() => colors.remove(i)}
                    className={s.rowRemove}
                  >
                    <CloseIcon size={18} />
                  </IconButton>
                </li>
              ))}
            </ul>
            {typeof errors.colors?.message === 'string' && <Alert>{errors.colors.message}</Alert>}
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => colors.append({ name: '', hex: '#808080' })}
              >
                Добавить цвет
              </Button>
            </div>
            <div className={s.grid2}>
              <TextField
                label="Название выбора"
                placeholder="Комплект, Память, Размер"
                error={errors.optionLabel?.message}
                {...register('optionLabel')}
              />
              <TextArea
                label="Варианты — по одному в строке"
                rows={3}
                placeholder={'128 ГБ\n256 ГБ'}
                error={errors.options?.message}
                {...register('options')}
              />
            </div>
          </section>

          <section className={s.block} aria-labelledby="ed-photos">
            <h3 id="ed-photos" className={s.h3}>
              Фото
            </h3>
            <p className={s.muted}>
              Фото для карточки — на светлом спокойном фоне, товар целиком. Остальные — детали и
              товар в жизни. Для каждого кадра укажите цвет: покупатель, выбравший цвет, увидит его.
            </p>
            <PhotoField />
          </section>

          <section className={s.block} aria-labelledby="ed-specs">
            <h3 id="ed-specs" className={s.h3}>
              Характеристики
            </h3>
            {specs.fields.length > 0 && (
              <ul className={s.editRows}>
                {specs.fields.map((field, i) => (
                  <li key={field.id} className={s.specRow}>
                    <TextField
                      label={`Характеристика ${i + 1}`}
                      placeholder="Работа от батареи"
                      error={errors.specs?.[i]?.label?.message}
                      {...register(`specs.${i}.label`)}
                    />
                    <TextField
                      label={`Значение ${i + 1}`}
                      placeholder="до 30 часов"
                      error={errors.specs?.[i]?.value?.message}
                      {...register(`specs.${i}.value`)}
                    />
                    <IconButton
                      label={`Убрать характеристику ${i + 1}`}
                      onClick={() => specs.remove(i)}
                      className={s.rowRemove}
                    >
                      <CloseIcon size={18} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => specs.append({ label: '', value: '' })}
              >
                Добавить характеристику
              </Button>
            </div>
            <p className={s.muted}>
              Подборщик читает характеристики по названиям: «Работа от батареи», «Экран», «Вес» —
              пишите так же, как у других товаров.
            </p>
          </section>

          <section className={s.block} aria-labelledby="ed-size">
            <h3 id="ed-size" className={s.h3}>
              Габариты «в масштабе»
            </h3>
            <div className={s.grid3}>
              <TextField label="Размер" placeholder="около 22 × 19 × 7 см" {...register('size')} />
              <TextField label="Вес" placeholder="250 г" {...register('weight')} />
              <TextField
                label="Сравнение"
                placeholder="вчетверо легче пачки сахара"
                {...register('compare')}
              />
            </div>
          </section>

          <section className={s.block} aria-labelledby="ed-show">
            <h3 id="ed-show" className={s.h3}>
              Поиск и показ
            </h3>
            <TextArea
              label="Теги для поиска — через запятую"
              rows={3}
              hint="Сценарии и синонимы: «для бега», «в подарок», «беспроводные»"
              {...register('tags')}
            />
            <div className={s.grid2}>
              <TextField
                label="Популярность, 0–1000 — порядок в каталоге"
                inputMode="numeric"
                error={errors.popularity?.message}
                {...register('popularity')}
              />
              <TextField
                label="Место в «Выборе недели»"
                inputMode="numeric"
                placeholder="Не участвует"
                error={errors.featuredRank?.message}
                {...register('featuredRank')}
              />
            </div>
            <Checkbox label="Продаётся — товар виден на витрине" {...register('isActive')} />
          </section>
        </form>

        <aside className={s.sticky} aria-label="Сохранение">
          <div className={s.panel}>
            <h3 className={s.h3}>{product ? 'Изменения' : 'Новый товар'}</h3>
            <p className={`${s.small} ${s.muted}`}>
              {product
                ? isDirty
                  ? 'Есть несохранённые правки.'
                  : 'Всё сохранено.'
                : 'Появится на витрине сразу после сохранения, если отмечено «Продаётся».'}
            </p>
            {Object.keys(errors).length > 0 && <Alert>{errorCount(errors)}</Alert>}
            {submitError && <Alert>{submitError}</Alert>}
            <div className={s.actions}>
              <Button
                type="submit"
                form={FORM_ID}
                loading={mutation.isPending}
                disabled={mutation.isPending || (Boolean(product) && !isDirty)}
              >
                {product ? 'Сохранить' : 'Добавить товар'}
              </Button>
              {product && isDirty && (
                <Button variant="secondary" onClick={() => form.reset(toFormValues(product))}>
                  Отменить правки
                </Button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </FormProvider>
  )
}
