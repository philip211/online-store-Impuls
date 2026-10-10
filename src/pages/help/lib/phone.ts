import { phoneDigits } from '@/shared/lib'

/** A Russian mobile in any spelling: 11 digits starting with 7 or 8. */
export const isPhoneComplete = (value: string) => /^[78]\d{10}$/.test(phoneDigits(value))
