import { matchHelpTopics } from './help-topics'

const ids = (query: string) => matchHelpTopics(query).map((t) => t.id)

describe('matchHelpTopics', () => {
  it('answers service questions', () => {
    expect(ids('возврат')[0]).toBe('returns')
    expect(ids('где мой заказ')[0]).toBe('order-status')
    expect(ids('когда привезут')[0]).toBe('delivery')
    expect(ids('Гарантия')[0]).toBe('warranty')
  })

  it('tolerates typos, wrong layout and unfinished words', () => {
    expect(ids('доствка')[0]).toBe('delivery')
    expect(ids('djpdhfn')[0]).toBe('returns')
    expect(ids('опла')[0]).toBe('payment')
  })

  it('stays quiet for product queries and noise', () => {
    expect(ids('наушники')).toEqual([])
    expect(ids('sony')).toEqual([])
    expect(ids('xyzzy')).toEqual([])
    expect(ids('до')).toEqual([])
    expect(ids('')).toEqual([])
  })

  it('respects the limit', () => {
    expect(matchHelpTopics('заказ доставка', 1)).toHaveLength(1)
    expect(matchHelpTopics('заказ доставка')).toHaveLength(2)
  })
})
