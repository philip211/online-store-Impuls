import { Link } from 'react-router'

import { routes } from '@/shared/config'
import { Container } from '@/shared/ui'

import s from './brand-strip.module.css'

const BRANDS = ['Sony', 'Apple', 'Samsung', 'Google', 'Nothing', 'Fujifilm', 'Marshall', 'JBL']

/** A quiet, static row of brands — a statement of range, not an animation. */
export function BrandStrip() {
  return (
    <Container as="section" className={s.strip} aria-label="Бренды в каталоге">
      <p className={s.caption}>Официальная техника</p>
      <ul className={s.list}>
        {BRANDS.map((b) => (
          <li key={b}>
            <Link to={routes.search(b)} viewTransition>
              {b}
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  )
}
