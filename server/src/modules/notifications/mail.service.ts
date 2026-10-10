import { Injectable, Logger } from '@nestjs/common'
import { createTransport, type Transporter } from 'nodemailer'

import { Env } from '../../config/env'
import type { RenderedMail } from './templates'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly transport: Transporter

  constructor(private readonly env: Env) {
    this.transport = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      // A hung mail server must fail fast: the outbox retries, and a batch has to finish
      // well within its lease or another worker would send the same emails.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    })
  }

  async send(mail: RenderedMail) {
    await this.transport.sendMail({ from: this.env.MAIL_FROM, ...mail })
    this.logger.debug(`Sent "${mail.subject}"`)
  }
}
