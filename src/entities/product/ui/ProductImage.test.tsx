import { fireEvent, render, screen } from '@testing-library/react'

import { PRODUCTS } from '../api/mock-db'
import { getImage } from '../lib/images'
import { Credit } from './Credit'
import { ProductImage } from './ProductImage'

const image = getImage(PRODUCTS[0]!)!

describe('ProductImage', () => {
  it('renders AVIF and WebP sources with intrinsic size, lazy by default', () => {
    const { container } = render(<ProductImage image={image} sizes="50vw" ratio="4 / 5" />)
    const img = screen.getByRole('img', { name: image.alt })
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('decoding', 'async')
    expect(img).toHaveAttribute('width', String(image.width))
    expect(img).toHaveAttribute('height', String(image.height))
    expect(img).not.toHaveAttribute('fetchpriority')
    const types = [...container.querySelectorAll('source')].map((s) => s.getAttribute('type'))
    expect(types).toEqual(['image/avif', 'image/webp'])
    const k = Math.round((image.width / image.height / 0.8) * 100) / 100
    const sizes = k > 1 ? `calc(50vw * ${k})` : '50vw'
    expect(container.querySelector('source')).toHaveAttribute('sizes', sizes)
  })

  it('widens sizes for a landscape photo cropped into a portrait frame', () => {
    const wide = { ...image, width: 1600, height: 1067 }
    const { container } = render(<ProductImage image={wide} sizes="50vw" ratio="4 / 5" />)
    expect(container.querySelector('source')).toHaveAttribute('sizes', 'calc(50vw * 1.87)')
  })

  it('fades in only after the photo loads', () => {
    const { container } = render(<ProductImage image={image} sizes="50vw" />)
    const frame = container.firstElementChild!
    expect(frame).not.toHaveClass('loaded')
    fireEvent.load(screen.getByRole('img'))
    expect(frame).toHaveClass('loaded')
  })

  it('loads the LCP photo eagerly with high priority, keeping the placeholder until load', () => {
    const { container } = render(<ProductImage image={image} sizes="100vw" priority />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('loading', 'eager')
    expect(img).toHaveAttribute('fetchpriority', 'high')
    const frame = container.firstElementChild!
    expect(frame).toHaveClass('priority')
    expect(frame).not.toHaveClass('loaded')
    fireEvent.load(img)
    expect(frame).toHaveClass('loaded')
  })

  it('can load eagerly without claiming high priority', () => {
    render(<ProductImage image={image} sizes="50vw" priority fetchPriority="auto" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('loading', 'eager')
    expect(img).not.toHaveAttribute('fetchpriority')
  })

  it('hides a decorative photo from assistive tech', () => {
    const { container } = render(<ProductImage image={image} sizes="50vw" decorative />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })
})

describe('Credit', () => {
  it('links the author and the Unsplash page', () => {
    // Every catalogue photo is a stock photo with an author.
    const credit = image.credit!
    render(<Credit credit={credit} />)
    expect(screen.getByText(/Фото:/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: credit.author })).toHaveAttribute(
      'href',
      expect.stringContaining(credit.authorUrl),
    )
    expect(screen.getByRole('link', { name: 'Unsplash' })).toHaveAttribute(
      'href',
      expect.stringContaining(credit.sourceUrl),
    )
  })

  it("shows no attribution for the shop's own photos", () => {
    const { container } = render(<Credit credit={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
