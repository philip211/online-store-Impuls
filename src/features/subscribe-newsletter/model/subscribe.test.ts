import { validateEmail } from './subscribe'

describe('validateEmail', () => {
  it.each([
    ['', 'Введите почту'],
    ['   ', 'Введите почту'],
    ['oops', 'Похоже, в адресе опечатка'],
    ['a@b', 'Похоже, в адресе опечатка'],
    ['a b@c.ru', 'Похоже, в адресе опечатка'],
  ])('rejects %j', (input, error) => expect(validateEmail(input)).toEqual({ ok: false, error }))

  it('accepts and trims a valid address', () => {
    expect(validateEmail('  anna@example.ru ')).toEqual({ ok: true, email: 'anna@example.ru' })
  })
})
