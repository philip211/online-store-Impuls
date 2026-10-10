import s from './spinner.module.css'

export function Spinner() {
  return <span className={s.spin} aria-hidden="true" />
}
