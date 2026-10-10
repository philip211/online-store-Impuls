import type { Product } from '@/entities/product'
import { text } from '@/shared/ui'

import { CARD_MM, formatCm, isPortraitKind, scaleScene } from '../lib/scale'
import s from './product-details.module.css'

/** Contact chip of an ID-1 card, measured from its top-left corner (ISO 7816-2, rounded). */
const CHIP = { x: 10, y: 19, w: 11, h: 9 }

/** What to call the side the drawing cannot show: a disc's height, a slab's thickness. */
function thirdSide(face: { w: number; h: number; round: boolean }, depth: number) {
  if (face.round) return 'высота'
  return depth < Math.min(face.w, face.h) * 0.2 ? 'толщина' : 'глубина'
}

/**
 * Physical size against a bank card, the in-scale reference most product pages lack.
 * Drawn from the listed dimensions alone: the front face as a plain shape beside the card.
 */
export function ScaleBlock({ product }: { product: Pick<Product, 'kind' | 'dimensions'> }) {
  const { size, weight, compare } = product.dimensions
  const scene = scaleScene(size, { portrait: isPortraitKind(product.kind) })
  const p = scene?.product
  const face = p && (p.round ? `Ø ${formatCm(p.w)}` : `${formatCm(p.w)} × ${formatCm(p.h)}`)
  const card = `${formatCm(CARD_MM.w)} × ${formatCm(CARD_MM.h)}`

  return (
    <section className={s.scale} aria-labelledby="pd-scale">
      <h2 id="pd-scale" className={s.subhead}>
        В масштабе
      </h2>

      {scene && p && (
        <figure className={s.scaleFig}>
          <svg
            viewBox={`-1 -1 ${scene.width + 2} ${scene.height + 2}`}
            preserveAspectRatio="xMinYMax meet"
            role="img"
            aria-label={`${product.kind} ${face} см рядом с банковской картой ${card} см`}
          >
            {p.round ? (
              <circle
                className={s.scaleProduct}
                cx={p.x + p.w / 2}
                cy={p.y + p.h / 2}
                r={p.w / 2}
              />
            ) : (
              <rect
                className={s.scaleProduct}
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                rx={Math.min(p.w, p.h) * 0.12}
              />
            )}
            <rect
              className={s.scaleCard}
              x={scene.card.x}
              y={scene.card.y}
              width={scene.card.w}
              height={scene.card.h}
              rx={3.2}
            />
            <rect
              className={s.scaleChip}
              x={scene.card.x + CHIP.x}
              y={scene.card.y + CHIP.y}
              width={CHIP.w}
              height={CHIP.h}
              rx={1.5}
            />
            <line
              className={s.scaleBase}
              x1={-1}
              x2={scene.width + 1}
              y1={scene.height}
              y2={scene.height}
            />
          </svg>
          <figcaption className={s.scaleLegend}>
            <span>
              <i className={s.keyProduct} aria-hidden="true" />
              {product.kind}, {face} см
              {scene.depth !== null && `, ${thirdSide(p, scene.depth)} ${formatCm(scene.depth)} см`}
            </span>
            <span>
              <i className={s.keyCard} aria-hidden="true" />
              Банковская карта, {card} см
            </span>
          </figcaption>
        </figure>
      )}

      <dl className={s.facts}>
        <div>
          <dt className={text.mono}>Размеры</dt>
          <dd>{size}</dd>
        </div>
        <div>
          <dt className={text.mono}>Вес</dt>
          <dd>{weight}</dd>
        </div>
        <div>
          <dt className={text.mono}>Для сравнения</dt>
          <dd>{compare}</dd>
        </div>
      </dl>
    </section>
  )
}
