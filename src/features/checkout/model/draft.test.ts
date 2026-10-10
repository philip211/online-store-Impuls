import { clearDraft, loadDraft, saveDraft } from './draft'
import { CHECKOUT_DEFAULTS } from './schema'

beforeEach(() => sessionStorage.clear())

describe('checkout draft', () => {
  it('round-trips through sessionStorage', () => {
    saveDraft({ ...CHECKOUT_DEFAULTS, name: 'Анна', shipping: 'pickup' })
    expect(loadDraft()).toMatchObject({ name: 'Анна', shipping: 'pickup', payment: 'card' })
  })

  it('keeps the address extra and gift options', () => {
    saveDraft({
      addressExtra: 'кв. 12, подъезд 3',
      gift: true,
      giftMessage: 'С днём рождения!',
      noReceipt: true,
    })
    expect(loadDraft()).toEqual({
      ...CHECKOUT_DEFAULTS,
      addressExtra: 'кв. 12, подъезд 3',
      gift: true,
      giftMessage: 'С днём рождения!',
      noReceipt: true,
    })
  })

  it('fills fields missing from older drafts with defaults', () => {
    sessionStorage.setItem('impulse-checkout-draft', JSON.stringify({ name: 'Анна' }))
    expect(loadDraft()).toEqual({ ...CHECKOUT_DEFAULTS, name: 'Анна' })
  })

  it('falls back to defaults for corrupt or invalid data', () => {
    sessionStorage.setItem('impulse-checkout-draft', '{oops')
    expect(loadDraft()).toEqual(CHECKOUT_DEFAULTS)
    sessionStorage.setItem('impulse-checkout-draft', JSON.stringify({ shipping: 'drone' }))
    expect(loadDraft()).toEqual(CHECKOUT_DEFAULTS)
    sessionStorage.setItem('impulse-checkout-draft', JSON.stringify({ gift: 'yes' }))
    expect(loadDraft()).toEqual(CHECKOUT_DEFAULTS)
  })

  it('clears', () => {
    saveDraft({ name: 'x' })
    clearDraft()
    expect(loadDraft()).toEqual(CHECKOUT_DEFAULTS)
  })
})
