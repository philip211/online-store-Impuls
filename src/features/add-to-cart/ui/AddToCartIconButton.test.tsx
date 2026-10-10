import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

import { useCartStore } from '@/entities/cart'
import type { Product } from '@/entities/product'

import { AddToCartIconButton } from './AddToCartIconButton'

const product: Product = {
  id: 2,
  slug: 'jbl-flip-6',
  category: 'sound',
  kind: 'Портативная колонка',
  name: 'JBL Flip 6',
  brand: 'JBL',
  price: 9_990,
  oldPrice: null,
  inStock: true,
  images: [],
  colors: [{ name: 'Синий', hex: '#2F5DA8' }],
  optionLabel: 'Комплект',
  options: ['Одна колонка'],
  description: '',
  specs: [],
  popularity: 1,
  tags: [],
  dimensions: { size: '', weight: '', compare: '' },
}

beforeEach(() => useCartStore.setState({ lines: [] }))

describe('AddToCartIconButton', () => {
  it('adds the default variant to the cart', async () => {
    render(<AddToCartIconButton product={product} />)
    await userEvent.click(screen.getByRole('button', { name: 'Добавить в корзину: JBL Flip 6' }))
    const [line] = useCartStore.getState().lines
    expect(line).toMatchObject({ productId: 2, colorName: 'Синий', option: 'Одна колонка', qty: 1 })
  })

  it('links to the restock alert when out of stock', () => {
    render(
      <MemoryRouter>
        <AddToCartIconButton product={{ ...product, inStock: false }} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button')).toBeNull()
    expect(
      screen.getByRole('link', { name: 'Нет в наличии. Сообщить о поступлении: JBL Flip 6' }),
    ).toHaveAttribute('href', '/product/jbl-flip-6#pd-restock-email')
  })
})
