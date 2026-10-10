import { Global, Module } from '@nestjs/common'

import { MailService } from './mail.service'
import { OutboxService } from './outbox.service'
import { OutboxWorker } from './outbox.worker'

@Global()
@Module({
  providers: [MailService, OutboxService, OutboxWorker],
  exports: [OutboxService, OutboxWorker],
})
export class NotificationsModule {}
