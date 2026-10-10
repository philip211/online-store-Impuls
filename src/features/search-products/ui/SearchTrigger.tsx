import clsx from 'clsx'

import { isMac } from '@/shared/lib'
import { IconButton, Kbd, SearchIcon } from '@/shared/ui'

import { openSearch } from '../model/search-store'
import s from './search.module.css'

/** Wide field-like button on desktop, icon on small screens. */
export function SearchTrigger({ className }: { className?: string }) {
  return (
    <>
      <button
        type="button"
        className={clsx(s.trigger, className)}
        onClick={openSearch}
        aria-keyshortcuts="Control+K Meta+K /"
      >
        <SearchIcon size={18} />
        <span className={s.triggerText}>Поиск товаров</span>
        <span className={s.triggerKeys} aria-hidden="true">
          <Kbd>{isMac() ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <IconButton label="Поиск" className={clsx(s.triggerIcon, className)} onClick={openSearch}>
        <SearchIcon />
      </IconButton>
    </>
  )
}
