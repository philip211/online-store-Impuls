import type { CSSProperties, KeyboardEvent } from 'react'

import { ProductImage, type ProductImageData } from '@/entities/product'
import { ChevronLeftIcon, CloseIcon, Dialog, IconButton } from '@/shared/ui'

import s from './product-details.module.css'

type PhotoZoomProps = {
  open: boolean
  onClose: () => void
  /** "Наушники Sony WH-1000XM5": names the dialog. */
  label: string
  photos: ProductImageData[]
  index: number
  onStep: (d: number) => void
}

/** Room above and below the photo for the bar and the caption. */
const CHROME_PX = 168

/**
 * One photo as large as the screen allows on a plain ground, nothing else on screen. The srcset
 * picks the file that fits the screen, so a phone reuses the gallery's cached variant.
 */
export function PhotoZoom({ open, onClose, label, photos, index, onStep }: PhotoZoomProps) {
  const photo = photos[index]
  const many = photos.length > 1

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!many) return
    if (e.key === 'ArrowRight') onStep(1)
    else if (e.key === 'ArrowLeft') onStep(-1)
    else return
    e.preventDefault()
  }

  // Fit inside the window: as wide as the column allows, no taller than the space left.
  const ratio = photo ? photo.width / photo.height : 1
  const fit = photo
    ? ({ width: `min(100%, calc((100dvh - ${CHROME_PX}px) * ${ratio}))` } as CSSProperties)
    : undefined
  // The same formula for the srcset: sizes cannot read the stage width or dvh, and 100vw /
  // 100vh are never smaller than them, so the estimate errs only on the large side.
  const zoomSizes = `min(100vw, calc((100vh - ${CHROME_PX}px) * ${ratio.toFixed(3)}))`

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="palette"
      label={`${label}, фото`}
      className={s.zoom}
    >
      <div className={s.zoomInner} onKeyDown={onKeyDown}>
        <div className={s.zoomBar}>
          <p className={s.zoomCount} aria-live="polite">
            {many ? `${index + 1} из ${photos.length}` : ''}
          </p>
          <IconButton label="Закрыть" onClick={onClose}>
            <CloseIcon size={20} />
          </IconButton>
        </div>

        <div className={s.zoomStage}>
          {/* Rendered lazily inside a closed <dialog>, so the large file loads only on open. */}
          {photo && <ProductImage key={photo.id} image={photo} sizes={zoomSizes} style={fit} />}
          {many && (
            <>
              <IconButton label="Предыдущее фото" className={s.zoomPrev} onClick={() => onStep(-1)}>
                <ChevronLeftIcon size={22} />
              </IconButton>
              <IconButton label="Следующее фото" className={s.zoomNext} onClick={() => onStep(1)}>
                <ChevronLeftIcon size={22} />
              </IconButton>
            </>
          )}
        </div>

        {photo && <p className={s.zoomCaption}>{photo.alt}</p>}
      </div>
    </Dialog>
  )
}
