import { z } from 'zod'

import { isApiError } from '@/shared/api'
import { phoneDigits } from '@/shared/lib'

const email = z
  .string()
  .trim()
  .min(1, 'Введите почту')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Похоже, в адресе опечатка')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Введите пароль'),
})

/** Same rule as the API: a letter and a digit, 8+ characters; long passphrases welcome. */
export const passwordRule = z
  .string()
  .min(8, 'Минимум 8 символов')
  .max(128, 'Слишком длинный пароль')
  .regex(/\p{L}/u, 'Добавьте хотя бы одну букву')
  .regex(/\d/, 'Добавьте хотя бы одну цифру')

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Напишите, как к вам обращаться').max(80, 'Слишком длинное имя'),
  email,
  /** Optional, but if given it must be a full Russian number. */
  phone: z
    .string()
    .refine((v) => phoneDigits(v).length === 0 || phoneDigits(v).length === 11, 'Нужно 11 цифр'),
  password: passwordRule,
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>

/** What to tell the person when the API turns the form down. */
export function authError(e: unknown): string {
  if (isApiError(e) && e.status < 500 && e.code !== 'VALIDATION_FAILED') return e.detail
  if (isApiError(e, 'TOO_MANY_REQUESTS')) return e.detail
  return 'Не получилось связаться с сервером. Попробуйте ещё раз.'
}
