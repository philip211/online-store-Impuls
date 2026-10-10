import type { Product } from '@/entities/product'

import s from './product-details.module.css'

type SpecGroup = { title: string; rows: { label: string; value: string }[] }

function groupSpecs(product: Product): SpecGroup[] {
  const { size, weight } = product.dimensions
  return [
    {
      title: 'Основное',
      // Weight lives with the dimensions below.
      rows: product.specs.filter((sp) => sp.label !== 'Вес'),
    },
    {
      title: 'Размеры и вес',
      rows: [
        { label: 'Габариты', value: size },
        { label: 'Вес', value: weight },
      ],
    },
    {
      title: 'Варианты',
      rows: [
        { label: 'Цвета', value: product.colors.map((c) => c.name).join(', ') },
        { label: product.optionLabel, value: product.options.join(', ') },
      ],
    },
  ].filter((g) => g.rows.length > 0)
}

export function Specs({ product }: { product: Product }) {
  return (
    <section className={s.specsBlock} aria-labelledby="pd-specs">
      <h2 id="pd-specs" className={s.subhead}>
        Характеристики
      </h2>
      {groupSpecs(product).map((g) => (
        <div key={g.title} className={s.specGroup}>
          <h3 className={s.specTitle}>{g.title}</h3>
          <dl className={s.specs}>
            {g.rows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  )
}
