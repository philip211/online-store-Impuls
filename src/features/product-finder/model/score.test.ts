import type { Product } from '@/entities/product'

import { parseGrams, parseHours, prefScore, recommend, relevance } from './score'

const make = (over: Partial<Product> & Pick<Product, 'id'>): Product => ({
  slug: `p-${over.id}`,
  category: 'sound',
  kind: 'Товар',
  name: `Товар ${over.id}`,
  brand: 'Бренд',
  price: 10_000,
  oldPrice: null,
  inStock: true,
  images: [],
  colors: [{ name: 'Чёрный', hex: '#000' }],
  optionLabel: 'Комплект',
  options: ['Один'],
  description: '',
  specs: [],
  popularity: 50,
  tags: [],
  dimensions: { size: '', weight: '300 г', compare: 'как яблоко' },
  ...over,
})

const headphones = make({
  id: 1,
  price: 32_990,
  tags: ['шумоподавление', 'для метро', 'для путешествий'],
  specs: [{ label: 'Работа от батареи', value: 'до 30 часов' }],
  dimensions: { size: '', weight: '250 г', compare: 'легче бутылки воды' },
})
const speaker = make({
  id: 2,
  price: 9_990,
  tags: ['для улицы'],
  specs: [{ label: 'Работа от батареи', value: 'до 12 часов' }],
})
const watch = make({
  id: 3,
  category: 'mobile',
  price: 24_990,
  tags: ['для спорта', 'для бега', 'пульс'],
  specs: [{ label: 'Работа от батареи', value: 'до 40 часов' }],
  dimensions: { size: '', weight: '33 г', compare: 'легче двух монет' },
})
const reader = make({
  id: 4,
  category: 'desk',
  price: 17_990,
  inStock: false,
  tags: ['для чтения', 'e-ink'],
  specs: [{ label: 'Работа от батареи', value: 'до 10 недель' }],
})
const camera = make({
  id: 5,
  category: 'photo',
  price: 8_490,
  tags: ['в подарок'],
  specs: [{ label: 'Размер снимка', value: '62 × 46 мм' }],
})

const all = [headphones, speaker, watch, reader, camera]

describe('parsers', () => {
  it.each([
    ['до 30 часов', 30],
    ['до 10 недель', 1680],
    ['2 дня', 48],
    ['IP67', null],
  ])('parseHours(%j)', (input, hours) => expect(parseHours(input)).toBe(hours))

  it.each([
    ['250 г', 250],
    ['1,2 кг', 1200],
    ['—', null],
  ])('parseGrams(%j)', (input, grams) => expect(parseGrams(input)).toBe(grams))
})

describe('scores', () => {
  it('relevance counts the category and matching tags', () => {
    expect(relevance(headphones, 'music')).toBe(6)
    expect(relevance(camera, 'music')).toBe(0)
  })

  it('prefScore reads specs and dimensions', () => {
    expect(prefScore(watch, 'battery')).toBe(3)
    expect(prefScore(speaker, 'battery')).toBe(1)
    expect(prefScore(watch, 'compact')).toBe(3)
    expect(prefScore(camera, 'screen')).toBe(1)
    expect(prefScore(camera, 'sound')).toBe(0)
  })
})

describe('recommend', () => {
  it('ranks relevant products and explains each with a fact', () => {
    const picks = recommend(all, { use: 'music', budget: 'any', pref: 'sound' })
    expect(picks.map((p) => p.product.id)).toEqual([1, 2])
    expect(picks[0]!.reason).toBe('Активное шумоподавление глушит метро и офис')
    expect(picks.every((p) => p.overBudget === 0)).toBe(true)
  })

  it('treats the budget as a hard limit while something fits', () => {
    const picks = recommend(all, { use: 'music', budget: '10', pref: 'battery' })
    expect(picks.map((p) => p.product.id)).toEqual([2])
    expect(picks[0]!.reason).toBe('До 12 часов без подзарядки')
  })

  it('falls back to the closest price and marks it when nothing fits', () => {
    const picks = recommend(all, { use: 'reading', budget: '10', pref: 'compact' })
    expect(picks).toHaveLength(1)
    expect(picks[0]!.product.id).toBe(4)
    expect(picks[0]!.overBudget).toBe(7_990)
  })

  it('uses the weight and comparison for compactness', () => {
    const [pick] = recommend(all, { use: 'sport', budget: '40', pref: 'compact' })
    expect(pick?.reason).toBe('Весит 33 г — легче двух монет')
  })

  it('falls back to the use case when the priority has no matching fact', () => {
    const [pick] = recommend(all, { use: 'photo', budget: 'any', pref: 'battery' })
    expect(pick?.reason).toBe('Подходит для снимков на память и в подарок')
  })

  it('prefers products in stock and caps the list', () => {
    const many = [1, 2, 3, 4, 5].map((id) =>
      make({ id, category: 'desk', inStock: id !== 1, popularity: id === 1 ? 100 : id }),
    )
    const picks = recommend(many, { use: 'work', budget: 'any', pref: 'battery' })
    expect(picks).toHaveLength(3)
    expect(picks.map((p) => p.product.id)).not.toContain(1)
  })
})
