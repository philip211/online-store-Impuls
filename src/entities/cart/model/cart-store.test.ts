import { MAX_QTY, migrateCart, useCartStore } from './cart-store'
import { countItems, subtotalOf } from './selectors'
import type { CartLineInput } from './types'

const item = (over: Partial<CartLineInput> = {}): CartLineInput => ({
  productId: 1,
  slug: 'sony-wh-1000xm5',
  name: 'Sony WH-1000XM5',
  kind: 'Наушники',
  price: 32_990,
  colorName: 'Платиновый',
  colorHex: '#C4CAD3',
  option: 'С чехлом',
  ...over,
})

beforeEach(() => useCartStore.setState({ lines: [] }))

describe('cart store', () => {
  it('merges identical variants into one line', () => {
    const { add } = useCartStore.getState()
    add(item())
    add(item())
    const { lines } = useCartStore.getState()
    expect(lines).toHaveLength(1)
    expect(lines[0]!.qty).toBe(2)
  })

  it('keeps different variants on separate lines', () => {
    const { add } = useCartStore.getState()
    add(item())
    add(item({ colorName: 'Чёрный' }))
    expect(useCartStore.getState().lines).toHaveLength(2)
  })

  it('clamps quantity between 1 and MAX_QTY', () => {
    const { add, setQty } = useCartStore.getState()
    add(item())
    const key = useCartStore.getState().lines[0]!.key
    setQty(key, 0)
    expect(useCartStore.getState().lines[0]!.qty).toBe(1)
    setQty(key, 1000)
    expect(useCartStore.getState().lines[0]!.qty).toBe(MAX_QTY)
  })

  it('computes count and subtotal', () => {
    const { add } = useCartStore.getState()
    add(item())
    add(item())
    add(item({ productId: 2, price: 9_990 }))
    const { lines } = useCartStore.getState()
    expect(countItems(lines)).toBe(3)
    expect(subtotalOf(lines)).toBe(32_990 * 2 + 9_990)
  })

  it('restores a removed line at its old position (undo)', () => {
    const { add, remove, restore } = useCartStore.getState()
    add(item({ productId: 1 }))
    add(item({ productId: 2 }))
    add(item({ productId: 3 }))
    const removed = useCartStore.getState().lines[1]!
    remove(removed.key)
    restore(removed, 1)
    expect(useCartStore.getState().lines.map((l) => l.productId)).toEqual([1, 2, 3])
    restore(removed, 1)
    expect(useCartStore.getState().lines).toHaveLength(3)
  })

  it('removes and clears', () => {
    const { add, remove, clear } = useCartStore.getState()
    add(item())
    add(item({ productId: 2 }))
    remove(useCartStore.getState().lines[0]!.key)
    expect(useCartStore.getState().lines).toHaveLength(1)
    clear()
    expect(useCartStore.getState().lines).toHaveLength(0)
  })

  it('ignores quantity changes for unknown lines and non-integer input', () => {
    const { add, setQty } = useCartStore.getState()
    add(item())
    const key = useCartStore.getState().lines[0]!.key
    setQty('missing', 5)
    expect(useCartStore.getState().lines[0]!.qty).toBe(1)
    setQty(key, 2.7)
    expect(useCartStore.getState().lines[0]!.qty).toBe(2)
  })

  it('restores at the end when the list became shorter (undo after more removals)', () => {
    const { add, remove, restore } = useCartStore.getState()
    add(item({ productId: 1 }))
    add(item({ productId: 2 }))
    add(item({ productId: 3 }))
    const last = useCartStore.getState().lines[2]!
    remove(last.key)
    remove(useCartStore.getState().lines[0]!.key)
    restore(last, 2)
    expect(useCartStore.getState().lines.map((l) => l.productId)).toEqual([2, 3])
  })
})

describe('persisted cart migration', () => {
  const line = { ...item(), key: '1|Платиновый|С чехлом', qty: 2 }

  it('drops version 1 lines, whose ids point at the old catalogue', () => {
    expect(migrateCart({ lines: [{ ...line, art: 'head' }] }, 1)).toEqual({ lines: [] })
    expect(migrateCart(undefined, 0)).toEqual({ lines: [] })
  })

  it('keeps valid lines and drops malformed ones', () => {
    const broken = { ...line, key: 'x', productId: '1' }
    expect(migrateCart({ lines: [line, broken, null] }, 2)).toEqual({ lines: [line] })
    expect(migrateCart({ lines: 'nope' }, 2)).toEqual({ lines: [] })
  })
})
