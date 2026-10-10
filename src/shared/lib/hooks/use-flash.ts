import { useCallback, useEffect, useRef, useState } from 'react'

/** A boolean that switches on and turns itself back off after `ms`. */
export function useFlash(ms: number) {
  const [on, setOn] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const flash = useCallback(() => {
    clearTimeout(timer.current)
    setOn(true)
    timer.current = setTimeout(() => setOn(false), ms)
  }, [ms])

  return [on, flash] as const
}
