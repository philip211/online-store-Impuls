import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { FREE_SHIPPING_FROM, RETURN_DAYS, routes } from '@/shared/config'
import { formatPrice, prefersReducedMotion } from '@/shared/lib'
import { CloseIcon } from '@/shared/ui'

import s from './announcement-bar.module.css'

type Message = { text: string; to?: string }

const MESSAGES: Message[] = [
  {
    text: `Бесплатная доставка от ${formatPrice(FREE_SHIPPING_FROM)}`,
    to: routes.help('delivery'),
  },
  { text: `Возврат в течение ${RETURN_DAYS} дней` },
  { text: 'Официальная гарантия на всю технику' },
]

const KEY = 'impulse-announce-closed'

function readClosed() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function AnnouncementBar() {
  const [closed, setClosed] = useState(readClosed)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  // Kept across pause/resume so hovering never restarts the cycle.
  const ticks = useRef(0)

  // One pass through the messages, then rest on the first (the free-shipping link). No endless loop.
  useEffect(() => {
    if (closed || paused || done || prefersReducedMotion()) return
    const id = setInterval(() => {
      ticks.current += 1
      setIndex(ticks.current % MESSAGES.length)
      if (ticks.current >= MESSAGES.length) setDone(true)
    }, 4500)
    return () => clearInterval(id)
  }, [closed, paused, done])

  if (closed) return null
  const message = MESSAGES[index]

  return (
    // Rotation pauses under the pointer and while focus is inside, so a link never moves away.
    <div
      className={s.bar}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {message && (
        <p className={s.msg} key={index}>
          {message.to ? (
            <Link to={message.to} viewTransition className={s.link}>
              {message.text}
            </Link>
          ) : (
            message.text
          )}
        </p>
      )}
      <button
        type="button"
        className={s.close}
        aria-label="Скрыть объявление"
        onClick={() => {
          setClosed(true)
          try {
            sessionStorage.setItem(KEY, '1')
          } catch {
            /* ignore */
          }
        }}
      >
        <CloseIcon size={16} />
      </button>
    </div>
  )
}
