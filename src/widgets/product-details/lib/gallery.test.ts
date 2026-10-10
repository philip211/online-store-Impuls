import type { ProductImageData } from '@/entities/product'

import { initialColorIndex, photoAfterColorChange, photosForColor, stepIndex } from './gallery'

const photo = (id: string, color: string, role: ProductImageData['role'] = 'gallery') =>
  ({ id, color, role }) as ProductImageData

const IMAGES = [
  photo('a/1', 'Чёрный', 'context'),
  photo('a/2', 'Чёрный', 'primary'),
  photo('a/3', 'Серебристый'),
]
const COLORS: [{ name: string; hex: string }, ...{ name: string; hex: string }[]] = [
  { name: 'Серебристый', hex: '#ccc' },
  { name: 'Чёрный', hex: '#111' },
]

describe('photosForColor', () => {
  it('keeps the colour’s own photos, primary first', () => {
    expect(photosForColor(IMAGES, 'Чёрный').map((p) => p.id)).toEqual(['a/2', 'a/1'])
  })
  it('falls back to every photo for a colour without its own', () => {
    expect(photosForColor(IMAGES, 'Синий')).toHaveLength(3)
  })
})

it('starts on the colour of the primary photo', () => {
  expect(initialColorIndex({ images: IMAGES, colors: COLORS })).toBe(1)
  expect(initialColorIndex({ images: [], colors: COLORS })).toBe(0)
})

describe('photoAfterColorChange', () => {
  it('switches to the colour’s photo', () => {
    expect(photoAfterColorChange({ images: IMAGES }, 'Серебристый', 'a/2')).toBe('a/3')
  })
  it('keeps the current photo when the colour has none', () => {
    expect(photoAfterColorChange({ images: IMAGES }, 'Синий', 'a/1')).toBe('a/1')
  })
})

it('steps around a ring', () => {
  expect(stepIndex(0, -1, 3)).toBe(2)
  expect(stepIndex(2, 1, 3)).toBe(0)
  expect(stepIndex(0, 1, 0)).toBe(0)
})
