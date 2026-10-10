import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { PRODUCTS } from '@/entities/product/testing'

import { ProductFinder } from './ProductFinder'

// The finder scores the whole catalogue, which comes from GET /products.
beforeEach(() => {
  vi.stubGlobal('fetch', () =>
    Promise.resolve(new Response(JSON.stringify({ items: PRODUCTS, total: PRODUCTS.length }))),
  )
})
afterEach(() => vi.unstubAllGlobals())

function renderAt(url: string) {
  const router = createMemoryRouter([{ path: '/finder', Component: ProductFinder }], {
    initialEntries: [url],
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

// jsdom does not implement scrolling.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

// A long click-through: no artificial delay between actions, and room for a busy CI machine.
describe('ProductFinder', { timeout: 15_000 }, () => {
  it('walks through three questions and keeps answers in the URL', async () => {
    const user = userEvent.setup({ delay: null })
    const router = renderAt('/finder')

    expect(screen.getByText('Вопрос 1 из 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Далее' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Выберите один вариант')

    await user.click(screen.getByRole('radio', { name: /Музыка в дороге/ }))
    await user.click(screen.getByRole('button', { name: 'Далее' }))
    expect(await screen.findByText('Вопрос 2 из 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Назад' }))
    expect(await screen.findByRole('radio', { name: /Музыка в дороге/ })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Далее' }))

    await user.click(await screen.findByRole('radio', { name: 'Не важно' }))
    await user.click(screen.getByRole('button', { name: 'Далее' }))
    await user.click(await screen.findByRole('radio', { name: /Звук/ }))
    await user.click(screen.getByRole('button', { name: 'Показать подборку' }))

    expect(router.state.location.search).toBe('?use=music&budget=any&pref=sound')
    expect(await screen.findByText('Sony WH-1000XM5', {}, { timeout: 2000 })).toBeInTheDocument()
    expect(screen.getAllByText('Почему подходит')).toHaveLength(3)
  })

  it('opens shared results straight from the link', async () => {
    renderAt('/finder?use=reading&budget=10&pref=compact')
    expect(
      await screen.findByText(/На 8\s990\s₽ выше бюджета/, {}, { timeout: 2000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Показать в каталоге/ })).toHaveAttribute(
      'href',
      // The pick is over budget, so the cap rises to the step that still lists it.
      '/catalog?cat=desk&max=20000',
    )
  })
})
