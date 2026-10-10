import s from './root-layout.module.css'

/** Shown while the first route chunk and its loader resolve. */
export function PageFallback() {
  return (
    <div className={s.fallback} role="status" aria-label="Загрузка">
      <span className={s.logo}>Импульс</span>
    </div>
  )
}
