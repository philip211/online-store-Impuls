import { routes } from '@/shared/config'
import { ButtonLink, Container, EmptyState } from '@/shared/ui'

type NotFoundPageProps = { title?: string; description?: string }

export function NotFoundPage({
  title = 'Страница не найдена',
  description = 'Возможно, ссылка устарела или в адресе опечатка. Начните с каталога или загляните в помощь.',
}: NotFoundPageProps) {
  return (
    <Container page style={{ paddingBottom: 64 }}>
      <title>{`${title} — Импульс`}</title>
      <EmptyState
        as="h1"
        size="page"
        title={title}
        description={description}
        action={
          <>
            <ButtonLink to={routes.catalog()}>В каталог</ButtonLink>
            <ButtonLink to={routes.help()} variant="secondary">
              Помощь
            </ButtonLink>
          </>
        }
      />
    </Container>
  )
}
