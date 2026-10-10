// The DOM build of RouterProvider wires navigations into document.startViewTransition.
import { RouterProvider } from 'react-router/dom'

import { router } from '../routes/router'
import { QueryProvider } from './QueryProvider'

export function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  )
}
