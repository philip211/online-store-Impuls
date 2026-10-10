import { migrateRestock, useRestockStore, validateEmail } from './restock'

describe('validateEmail', () => {
  it.each([
    ['', 'Введите почту'],
    ['  ', 'Введите почту'],
    ['anna', 'Похоже, в адресе опечатка'],
    ['anna@mail', 'Похоже, в адресе опечатка'],
  ])('rejects %j', (input, error) => expect(validateEmail(input)).toEqual({ ok: false, error }))

  it('trims a valid address', () => {
    expect(validateEmail(' anna@mail.ru ')).toEqual({ ok: true, email: 'anna@mail.ru' })
  })
})

describe('useRestockStore', () => {
  beforeEach(() => useRestockStore.setState({ requests: {} }))

  it('keeps one request per product', () => {
    const { save } = useRestockStore.getState()
    save(7, 'a@b.ru')
    save(12, 'c@d.ru')
    save(7, 'e@f.ru')
    expect(useRestockStore.getState().requests).toEqual({ 7: 'e@f.ru', 12: 'c@d.ru' })
  })

  it('cancels a request without touching others', () => {
    const { save, cancel } = useRestockStore.getState()
    save(7, 'a@b.ru')
    save(12, 'c@d.ru')
    cancel(7)
    expect(useRestockStore.getState().requests).toEqual({ 12: 'c@d.ru' })
  })
})

describe('migrateRestock', () => {
  it('drops requests saved against the old catalogue', () => {
    expect(migrateRestock({ requests: { 3: 'a@b.ru' } }, 1)).toEqual({ requests: {} })
  })

  it('keeps valid requests at the current version', () => {
    const persisted = { requests: { 3: 'a@b.ru', x: 'c@d.ru', 4: 5 } }
    expect(migrateRestock(persisted, 2)).toEqual({ requests: { 3: 'a@b.ru' } })
  })
})
