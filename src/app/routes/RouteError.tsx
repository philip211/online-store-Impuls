import { isRouteErrorResponse, useRouteError } from 'react-router'

import { NotFoundPage } from '@/pages/not-found'
import { routes } from '@/shared/config'
import { Button, ButtonLink, Container, EmptyState } from '@/shared/ui'

const RELOAD_FLAG = 'impulse-chunk-reload'

/** A lazy route's file is gone: the site was redeployed while this tab was open. */
const isStaleChunk = (error: unknown) =>
  error instanceof Error &&
  /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(
    error.message,
  )

/** Reloads once to pick up the new build; a second failure in a row shows the error page. */
function reloadOnce(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

export function RouteError() {
  const error = useRouteError()

  if (isStaleChunk(error) && reloadOnce()) return null

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <NotFoundPage
        title={typeof error.data === 'string' ? error.data : 'Страница не найдена'}
        description="Возможно, товар сняли с продажи или в ссылке опечатка. Начните с каталога или загляните в помощь."
      />
    )
  }

  if (import.meta.env.DEV) console.error(error)

  return (
    <Container page style={{ paddingBottom: 64 }}>
      <title>Ошибка — Импульс</title>
      <EmptyState
        as="h1"
        size="page"
        title="Что-то пошло не так"
        description="Страница не загрузилась. Обычно помогает обновить её; если нет — каталог и помощь работают."
        action={
          <>
            <Button onClick={() => window.location.reload()}>Обновить страницу</Button>
            <ButtonLink to={routes.catalog()} variant="secondary">
              В каталог
            </ButtonLink>
            <ButtonLink to={routes.help()} variant="secondary">
              Помощь
            </ButtonLink>
          </>
        }
      />
    </Container>
  )
}
