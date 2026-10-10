import { Module } from '@nestjs/common'

import { CategoriesController, ProductsController } from './catalog.controller'
import { CatalogService } from './catalog.service'

@Module({
  controllers: [ProductsController, CategoriesController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
