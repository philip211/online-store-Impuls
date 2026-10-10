import { reasonLabel, validateReturn } from './return-request'

describe('return request', () => {
  const phone = '+7 900 123-45-67'

  it('needs a valid order number and the order phone; the reason is optional', () => {
    expect(validateReturn({ order: '', phone, reason: 'none' }).order).toMatch(/Укажите/)
    expect(validateReturn({ order: 'abc', phone, reason: 'none' }).order).toMatch(/IM-123456/)
    expect(validateReturn({ order: 'IM-123456', phone: '123', reason: 'none' }).phone).toMatch(
      /телефон/,
    )
    expect(validateReturn({ order: 'IM-123456', phone, reason: 'none' })).toEqual({})
  })

  it('labels reasons', () => {
    expect(reasonLabel('fit')).toBe('Не подошёл')
  })
})
