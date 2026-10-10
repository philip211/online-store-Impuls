import type { CategoryId, ProductFilters, ProductSort } from './types'

export const CATEGORY_NAMES: Record<CategoryId, string> = {
  sound: 'Звук',
  mobile: 'Смартфоны и часы',
  photo: 'Фото',
  desk: 'Работа и чтение',
}

export const CATEGORY_IDS = Object.keys(CATEGORY_NAMES) as CategoryId[]

export const PRICE_CAPS = [
  { value: null, label: 'Любая' },
  { value: 20_000, label: 'до 20 000 ₽' },
  { value: 50_000, label: 'до 50 000 ₽' },
  { value: 100_000, label: 'до 100 000 ₽' },
] as const

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'popular', label: 'Сначала популярные' },
  { value: 'price-asc', label: 'Сначала дешевле' },
  { value: 'price-desc', label: 'Сначала дороже' },
]

export const DEFAULT_FILTERS: ProductFilters = {
  query: '',
  category: 'all',
  maxPrice: null,
  inStockOnly: false,
  sort: 'popular',
}

export const isCategoryId = (v: unknown): v is CategoryId =>
  typeof v === 'string' && v in CATEGORY_NAMES

export const isProductSort = (v: unknown): v is ProductSort =>
  SORT_OPTIONS.some((o) => o.value === v)
