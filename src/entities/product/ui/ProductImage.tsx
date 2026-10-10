import clsx from 'clsx'
import { useCallback, useState, type CSSProperties } from 'react'

import { coverSizes, parseRatio } from '../lib/cover-sizes'
import type { ProductImage as ProductImageData } from '../model/types'
import s from './image.module.css'

type ProductImageProps = {
  image: ProductImageData
  /** Rendered width of the frame for the srcset, e.g. "(min-width: 1024px) 25vw, 50vw". */
  sizes: string
  /** CSS aspect-ratio of the frame, e.g. "4 / 5". Defaults to the photo's own proportions. */
  ratio?: string
  /**
   * Width / height of the narrowest frame the photo sits in, when that ratio is set in CSS
   * rather than through `ratio`. A wider photo is cropped by object-fit: cover and drawn wider
   * than the frame, so `sizes` is scaled up to match. Defaults to `ratio`.
   */
  frameAspect?: number
  /**
   * Above-the-fold photo: loads eagerly, skips the fade-in, but keeps the blurred placeholder
   * until the photo arrives. Gets fetchpriority=high unless `fetchPriority` is 'auto'.
   */
  priority?: boolean
  /** Lets an eager photo that is not a likely LCP give way to the ones that are. */
  fetchPriority?: 'high' | 'auto'
  /** Purely decorative use (the product is named next to it): empty alt, hidden from AT. */
  decorative?: boolean
  className?: string
  /** Applied to the frame, e.g. a view-transition name. */
  style?: CSSProperties
}

/**
 * A product photo: AVIF and WebP sources, intrinsic size to avoid layout shift, the focal
 * point kept in frame when cropped, and a blurred placeholder that fades out on load.
 */
export function ProductImage({
  image,
  sizes,
  ratio,
  frameAspect,
  priority = false,
  fetchPriority = 'high',
  decorative = false,
  className,
  style,
}: ProductImageProps) {
  // Keyed by photo id, so switching to another photo shows its placeholder again.
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const loaded = loadedId === image.id
  const id = image.id
  const aspect = frameAspect ?? parseRatio(ratio)
  const srcSizes = aspect ? coverSizes(sizes, image.width / image.height, aspect) : sizes

  // A cached image may finish before React attaches onLoad; the ref catches that case.
  const imgRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0) setLoadedId(id)
    },
    [id],
  )

  const frameStyle = {
    ...style,
    aspectRatio: ratio ?? `${image.width} / ${image.height}`,
    '--ph': `url("${image.placeholder}")`,
    '--ph-color': image.dominant,
    '--focal': image.focal,
  } as CSSProperties

  return (
    <div
      className={clsx(s.frame, loaded && s.loaded, priority && s.priority, className)}
      style={frameStyle}
    >
      <picture>
        {image.sources.map((source) => (
          <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={srcSizes} />
        ))}
        <img
          key={image.id}
          ref={imgRef}
          className={s.img}
          src={image.src}
          width={image.width}
          height={image.height}
          alt={decorative ? '' : image.alt}
          aria-hidden={decorative || undefined}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority && fetchPriority === 'high' ? 'high' : undefined}
          decoding="async"
          draggable={false}
          onLoad={() => setLoadedId(id)}
        />
      </picture>
    </div>
  )
}
