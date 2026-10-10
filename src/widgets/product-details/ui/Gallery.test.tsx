import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import type { Product, ProductImageData } from '@/entities/product'

import { Gallery } from './Gallery'

const photo = (n: number, color: string, role: ProductImageData['role']): ProductImageData => ({
  id: `sony/${n}`,
  role,
  color,
  alt: `Снимок ${n}`,
  focal: '50% 50%',
  tone: 'mid',
  credit: {
    author: `Автор ${n}`,
    authorUrl: 'https://unsplash.com/@a',
    sourceUrl: 'https://unsplash.com/photos/x',
    id: 'x',
  },
  width: 1600,
  height: 1067,
  placeholder: '',
  dominant: '#777777',
  sources: [{ type: 'image/webp', srcSet: `/media/sony/${n}-800.webp 800w` }],
  src: `/media/sony/${n}-800.webp`,
})

const product: Product = {
  id: 1,
  slug: 'sony',
  category: 'sound',
  kind: 'Наушники',
  name: 'Sony WH-1000XM5',
  brand: 'Sony',
  price: 32_990,
  oldPrice: null,
  inStock: true,
  images: [
    photo(1, 'Чёрный', 'primary'),
    photo(2, 'Чёрный', 'context'),
    photo(3, 'Серебристый', 'gallery'),
  ],
  colors: [
    { name: 'Чёрный', hex: '#111111' },
    { name: 'Серебристый', hex: '#cccccc' },
  ],
  optionLabel: 'Комплект',
  options: ['С чехлом'],
  description: '',
  specs: [],
  popularity: 1,
  tags: [],
  dimensions: { size: '', weight: '', compare: '' },
}

function Harness({ color }: { color: string }) {
  const [id, setId] = useState<string | null>('sony/1')
  return <Gallery product={product} color={color} activeId={id} onSelect={setId} />
}

const pressed = () =>
  screen.getAllByRole('button', { pressed: true }).map((b) => b.getAttribute('aria-label'))

describe('Gallery', () => {
  it('shows a thumbnail per photo of the colour and the active photo’s credit', () => {
    render(<Harness color="Чёрный" />)
    expect(screen.getAllByRole('button', { name: /^Фото \d/ })).toHaveLength(2)
    expect(pressed()).toEqual(['Фото 1: Снимок 1'])
    expect(screen.getByRole('link', { name: 'Автор 1' })).toBeInTheDocument()
  })

  it('pages with the arrow keys and the thumbnails', async () => {
    render(<Harness color="Чёрный" />)
    const stage = screen.getByRole('button', { name: /Открыть крупно/ })
    fireEvent.keyDown(stage, { key: 'ArrowRight' })
    expect(pressed()).toEqual(['Фото 2: Снимок 2'])
    fireEvent.keyDown(stage, { key: 'ArrowRight' })
    expect(pressed()).toEqual(['Фото 1: Снимок 1'])
    await userEvent.click(screen.getByRole('button', { name: 'Фото 2: Снимок 2' }))
    expect(screen.getByRole('link', { name: 'Автор 2' })).toBeInTheDocument()
  })

  it('hides the thumbnails when the colour has a single photo', () => {
    render(<Harness color="Серебристый" />)
    expect(screen.queryAllByRole('button', { name: /^Фото \d/ })).toHaveLength(0)
  })
})
