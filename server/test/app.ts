import { randomUUID } from 'node:crypto'

import type { INestApplication } from '@nestjs/common'
import { ThrottlerStorage } from '@nestjs/throttler'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import type { App } from 'supertest/types'

import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { setupApp } from '../src/setup-app'

/** Rate limits would trip over the burst of test requests from one address. */
const noLimits: ThrottlerStorage = {
  increment: async () => ({
    totalHits: 1,
    timeToExpire: 60,
    isBlocked: false,
    timeToBlockExpire: 0,
  }),
}

export async function createApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ThrottlerStorage)
    .useValue(noLimits)
    .compile()
  const app: INestApplication<App> = moduleRef.createNestApplication({ logger: false })
  setupApp(app)
  await app.init()
  const http = () => request(app.getHttpServer())
  return { app, http, prisma: app.get(PrismaService) }
}

export type TestApp = Awaited<ReturnType<typeof createApp>>

export async function registerUser(http: TestApp['http']) {
  const email = `user-${randomUUID()}@test.ru`
  const res = await http()
    .post('/api/v1/auth/register')
    .send({ email, password: 'secret123', name: 'Покупатель' })
    .expect(201)
  return {
    email,
    token: res.body.accessToken as string,
    cookie: String(res.headers['set-cookie']?.[0] ?? '').split(';')[0] ?? '',
    id: res.body.user.id as string,
  }
}

export async function loginAdmin(http: TestApp['http']) {
  const res = await http()
    .post('/api/v1/auth/login')
    .send({ email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD })
    .expect(200)
  return res.body.accessToken as string
}

/** A checkout body for one product with its first colour and option. */
export async function orderFor(
  http: TestApp['http'],
  slug: string,
  overrides: {
    payment?: 'card' | 'cash'
    shipping?: 'courier' | 'pickup'
    qty?: number
    email?: string
  } = {},
) {
  const p = (await http().get(`/api/v1/products/${slug}`).expect(200)).body
  return {
    product: p as { id: number; price: number },
    body: {
      customer: {
        name: 'Иван',
        phone: '+7 900 123-45-67',
        email: overrides.email,
        address: 'Москва, Тверская, 1',
        addressExtra: 'кв. 5',
        shipping: overrides.shipping ?? 'pickup',
        payment: overrides.payment ?? 'cash',
        gift: false,
        giftMessage: '',
        noReceipt: false,
      },
      lines: [
        {
          productId: p.id,
          colorName: p.colors[0].name,
          option: p.options[0],
          qty: overrides.qty ?? 1,
          price: p.price,
        },
      ],
    },
  }
}
