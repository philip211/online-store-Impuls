import { useSuspenseQuery } from '@tanstack/react-query'

import { HERO_SLUG, productQueries, useRecentProducts, type Product } from '@/entities/product'
import { routes } from '@/shared/config'
import { ITEM_FORMS, pluralize } from '@/shared/lib'
import { ArrowRightIcon, ButtonLink, Section, SectionHeader } from '@/shared/ui'
import { BrandStrip } from '@/widgets/brand-strip'
import { CategoryShowcase } from '@/widgets/category-showcase'
import { DealsBanner } from '@/widgets/deals-banner'
import { Hero } from '@/widgets/hero'
import { ProductGrid } from '@/widgets/product-grid'
import { ProductStory } from '@/widgets/product-story'
import { TrustBar } from '@/widgets/trust-bar'

import { FinderBand } from './FinderBand'

export function HomePage() {
  const { data: hero } = useSuspenseQuery(productQueries.detail(HERO_SLUG))
  const { data: featured } = useSuspenseQuery(productQueries.featured())
  const { data: categories } = useSuspenseQuery(productQueries.categories())
  const { data: deals } = useSuspenseQuery(productQueries.deals())
  const recent = useRecentProducts()
  const product = hero as Product
  const total = categories.reduce((sum, c) => sum + c.count, 0)
  const sectionCount = categories.find((c) => c.id === product.category)?.count ?? 0

  return (
    <>
      <title>Импульс — магазин электроники</title>
      <Hero product={product} />
      <BrandStrip />
      <CategoryShowcase categories={categories} />
      <ProductStory product={product} sectionCount={sectionCount} />
      <Section flush aria-labelledby="h-picks">
        <SectionHeader
          id="h-picks"
          eyebrow="Выбор редакции"
          title="Чем пользуемся сами"
          lead="Четыре вещи, которые каждый день лежат у нас на столе и в рюкзаке."
          aside={
            <ButtonLink to={routes.catalog()} variant="secondary" size="sm">
              Все {pluralize(total, ITEM_FORMS)} в каталоге
              <ArrowRightIcon size={18} />
            </ButtonLink>
          }
        />
        <ProductGrid products={featured} columns={4} reveal />
      </Section>
      <FinderBand />
      <DealsBanner products={deals} />
      {recent.length > 0 && (
        <Section flush aria-labelledby="h-recent">
          <SectionHeader id="h-recent" eyebrow="Недавние" title="Вы смотрели" />
          <ProductGrid products={recent} columns={4} compact reveal />
        </Section>
      )}
      <TrustBar />
    </>
  )
}
