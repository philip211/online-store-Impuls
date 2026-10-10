import { Module } from '@nestjs/common'

import { NewsletterController, RestockController } from './subscriptions.controller'
import { NewsletterService, RestockService } from './subscriptions.service'

@Module({
  controllers: [NewsletterController, RestockController],
  providers: [NewsletterService, RestockService],
  exports: [RestockService],
})
export class SubscriptionsModule {}
