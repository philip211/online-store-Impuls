import onestCyrillic from '@fontsource-variable/onest/files/onest-cyrillic-wght-normal.woff2?url'
import { StrictMode } from 'react'
import { preload } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { initSession } from '@/entities/session'

import '../styles/index.css'
import { App } from './App'

// Most of the copy is Cyrillic: fetch that subset now rather than after the CSS is parsed.
preload(onestCyrillic, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })

// Once, outside React: restores a signed-in visitor from the refresh cookie.
initSession()

// The route boundary reloads once when a lazy chunk vanished after a redeploy; forget that
// flag once the app has run for a while, so a later deploy gets its reload too.
window.setTimeout(() => {
  try {
    sessionStorage.removeItem('impulse-chunk-reload')
  } catch {
    // Storage unavailable: nothing to clean up.
  }
}, 10_000)

const root = document.getElementById('root')
if (!root) throw new Error('#root element is missing in index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
