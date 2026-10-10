import type { Product, ProductImageData } from '@/entities/product'

import { resolveLineImage } from './line-images'

const photo = (id: string, color: string, role: ProductImageData['role']) =>
  ({ id, color, role }) as ProductImageData

const product = {
  id: 1,
  slug: 'sony-wh-1000xm5',
  images: [
    photo('sony-wh-1000xm5/1', 'Чёрный', 'primary'),
    photo('sony-wh-1000xm5/2', 'Чёрный', 'context'),
    photo('sony-wh-1000xm5/3', 'Платиновый серебристый', 'gallery'),
  ],
} as Product

const line = { productId: 1, slug: 'sony-wh-1000xm5', colorName: 'Чёрный' }

describe('resolveLineImage', () => {
  it('uses the stored photo id when it still exists', () => {
    expect(resolveLineImage({ ...line, image: 'sony-wh-1000xm5/2' }, [product])?.id).toBe(
      'sony-wh-1000xm5/2',
    )
  })

  it('falls back to the photo of the chosen colour', () => {
    const silver = { ...line, colorName: 'Платиновый серебристый', image: 'gone/9' }
    expect(resolveLineImage(silver, [product])?.id).toBe('sony-wh-1000xm5/3')
    expect(resolveLineImage(line, [product])?.id).toBe('sony-wh-1000xm5/1')
  })

  it('shows nothing when the id now belongs to another product', () => {
    expect(resolveLineImage({ ...line, slug: 'old-slug' }, [product])).toBeNull()
    expect(resolveLineImage(line, [])).toBeNull()
  })
})
