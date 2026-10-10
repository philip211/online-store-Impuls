const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export type EmailCheck = { ok: true; email: string } | { ok: false; error: string }

/**
 * Hand-rolled on purpose: email fields live outside checkout (footer, restock
 * alerts), and pulling zod into the entry chunk would triple it.
 */
export function validateEmail(value: string): EmailCheck {
  const email = value.trim()
  if (!email) return { ok: false, error: 'Введите почту' }
  if (!EMAIL.test(email)) return { ok: false, error: 'Похоже, в адресе опечатка' }
  return { ok: true, email }
}
