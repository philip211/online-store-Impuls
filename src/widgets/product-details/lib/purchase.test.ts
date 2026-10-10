import { COURIER_PRICE, FREE_SHIPPING_FROM } from '@/shared/config'

import { courierCost, totalWithDelivery } from './purchase'

describe('purchase totals', () => {
  it('charges the courier below the threshold', () => {
    expect(courierCost(9_990)).toBe(COURIER_PRICE)
    expect(totalWithDelivery(9_990)).toBe(9_990 + COURIER_PRICE)
  })

  it('is free from the threshold up', () => {
    expect(courierCost(FREE_SHIPPING_FROM)).toBe(0)
    expect(totalWithDelivery(32_990)).toBe(32_990)
  })
})
