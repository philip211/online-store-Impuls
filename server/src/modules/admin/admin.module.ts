import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { CatalogModule } from '../catalog/catalog.module'
import { OrdersModule } from '../orders/orders.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { AdminCatalogService } from './admin-catalog.service'
import {
  AdminCatalogController,
  AdminSalesController,
  AdminUsersController,
} from './admin.controller'
import { AdminSalesService } from './admin-sales.service'
import { AdminUsersService } from './admin-users.service'
import { MediaService } from './media.service'

@Module({
  imports: [AuthModule, CatalogModule, OrdersModule, SubscriptionsModule],
  controllers: [AdminCatalogController, AdminSalesController, AdminUsersController],
  providers: [AdminCatalogService, AdminSalesService, AdminUsersService, MediaService],
})
export class AdminModule {}
