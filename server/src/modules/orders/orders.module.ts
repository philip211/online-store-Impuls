import { Module } from '@nestjs/common'

import { Env } from '../../config/env'
import { CatalogModule } from '../catalog/catalog.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { OrderLifecycleService } from './order-lifecycle.service'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { PAYMENT_GATEWAY } from './payments/gateway'
import { MockGateway } from './payments/mock.gateway'
import { PaymentsController } from './payments/payments.controller'
import { PaymentsService } from './payments/payments.service'
import { YooKassaGateway } from './payments/yookassa.gateway'

/** Checkout, order lifecycle and payments: one bounded context. */
@Module({
  imports: [CatalogModule, SubscriptionsModule],
  controllers: [OrdersController, PaymentsController],
  providers: [
    OrdersService,
    OrderLifecycleService,
    PaymentsService,
    MockGateway,
    {
      provide: PAYMENT_GATEWAY,
      inject: [Env, MockGateway],
      useFactory: (env: Env, mock: MockGateway) =>
        env.PAYMENT_PROVIDER === 'yookassa' ? new YooKassaGateway(env) : mock,
    },
  ],
  exports: [OrdersService, OrderLifecycleService, PaymentsService],
})
export class OrdersModule {}
