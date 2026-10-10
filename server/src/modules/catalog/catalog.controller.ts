import { Controller, Get, Header, Param, Query } from '@nestjs/common'
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CatalogService } from './catalog.service'
import { LookupQueryDto, ProductFiltersQueryDto, SearchQueryDto } from './dto/catalog-query.dto'
import {
  CategoryDto,
  ProductDto,
  ProductFacetsDto,
  ProductListDto,
  SearchResultDto,
} from './dto/product.dto'
import { SlugParamDto } from './dto/slug-param.dto'

/** Catalogue data changes rarely: browsers and CDNs may reuse it briefly. */
const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300'

@ApiTags('Каталог')
@Controller('products')
export class ProductsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Каталог с фильтрами и сортировкой' })
  list(@Query() query: ProductFiltersQueryDto): Promise<ProductListDto> {
    return this.catalog.list(query.toFilters())
  }

  @Get('search')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Быстрый поиск для палитры: лучшие совпадения и «возможно, вы имели в виду»',
  })
  search(@Query() query: SearchQueryDto): Promise<SearchResultDto> {
    return this.catalog.search(query.q, query.limit)
  }

  @Get('facets')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Счётчики для каждого значения фильтров' })
  facets(@Query() query: ProductFiltersQueryDto): Promise<ProductFacetsDto> {
    return this.catalog.facets(query.toFilters())
  }

  @Get('featured')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Подборка «Выбор недели»' })
  featured(): Promise<ProductDto[]> {
    return this.catalog.featured()
  }

  @Get('deals')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Товары со скидкой, сначала самые большие скидки' })
  deals(): Promise<ProductDto[]> {
    return this.catalog.deals()
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Товары по списку id или slug (избранное, «вы смотрели»)' })
  async lookup(@Query() query: LookupQueryDto): Promise<ProductDto[]> {
    if (query.ids?.length) return this.catalog.byIds(query.ids)
    if (query.slugs?.length) return this.catalog.bySlugs(query.slugs)
    return []
  }

  @Get(':slug')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Карточка товара' })
  @ApiNotFoundResponse({ description: 'Товара нет или он снят с продажи' })
  bySlug(@Param() { slug }: SlugParamDto): Promise<ProductDto> {
    return this.catalog.bySlug(slug)
  }

  @Get(':slug/similar')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Похожие товары: сначала из того же раздела' })
  similar(@Param() { slug }: SlugParamDto): Promise<ProductDto[]> {
    return this.catalog.similar(slug)
  }
}

@ApiTags('Каталог')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Разделы каталога с обложками и количеством товаров' })
  list(): Promise<CategoryDto[]> {
    return this.catalog.categories()
  }
}
