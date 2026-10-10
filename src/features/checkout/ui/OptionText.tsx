import s from './checkout.module.css'

/** Two-line label for an option card: what it is, then the concrete terms. */
export function OptionText({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <span className={s.optTitle}>{title}</span>
      <span className={s.optSub}>{sub}</span>
    </>
  )
}
