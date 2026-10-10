import { answer, isComplete, labelOf, parseAnswers, resolveStep, stepBack } from './answers'

const qs = (s: string) => new URLSearchParams(s)

describe('parseAnswers', () => {
  it('reads known values and drops unknown ones', () => {
    expect(parseAnswers(qs('use=sport&budget=20&pref=nope'))).toEqual({
      use: 'sport',
      budget: '20',
      pref: null,
    })
  })

  it('isComplete needs all three answers', () => {
    expect(isComplete(parseAnswers(qs('use=music&budget=any')))).toBe(false)
    expect(isComplete(parseAnswers(qs('use=music&budget=any&pref=sound')))).toBe(true)
  })
})

describe('resolveStep', () => {
  it('starts at the first unanswered question', () => {
    expect(resolveStep(qs(''))).toBe(0)
    expect(resolveStep(qs('use=music'))).toBe(1)
    expect(resolveStep(qs('use=music&pref=sound'))).toBe(1)
  })

  it('shows results when everything is answered', () => {
    expect(resolveStep(qs('use=music&budget=10&pref=sound'))).toBe('results')
  })

  it('honours ?step= but never skips an unanswered question', () => {
    expect(resolveStep(qs('use=music&budget=10&pref=sound&step=1'))).toBe(0)
    expect(resolveStep(qs('step=3'))).toBe(0)
    expect(resolveStep(qs('use=music&step=9'))).toBe(1)
  })
})

describe('answer / stepBack', () => {
  it('walks forward question by question, then to results', () => {
    let p = answer(qs(''), 'use', 'photo')
    expect(resolveStep(p)).toBe(1)
    p = answer(p, 'budget', '20')
    expect(resolveStep(p)).toBe(2)
    p = answer(p, 'pref', 'screen')
    expect(resolveStep(p)).toBe('results')
    expect(p.toString()).toBe('use=photo&budget=20&pref=screen')
  })

  it('changing an earlier answer keeps the later ones and revisits the next question', () => {
    const p = answer(qs('use=photo&budget=20&pref=screen&step=1'), 'use', 'work')
    expect(parseAnswers(p)).toEqual({ use: 'work', budget: '20', pref: 'screen' })
    expect(resolveStep(p)).toBe(1)
  })

  it('goes back one screen, from results to the last question', () => {
    const done = qs('use=photo&budget=20&pref=screen')
    expect(resolveStep(stepBack(done, 'results'))).toBe(2)
    expect(resolveStep(stepBack(done, 1))).toBe(0)
  })

  it('labels values for summaries', () => {
    expect(labelOf('budget', '10')).toBe('до 10 000 ₽')
  })
})
