/** Emails are compared and stored lower-cased and trimmed. */
export const normalizeEmail = (value: string) => value.trim().toLowerCase()
