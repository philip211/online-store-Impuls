import { ValidationPipe, type ValidationError } from '@nestjs/common'

import { type FieldError, ValidationException } from './errors'

/** Nested DTO errors become dotted paths: `lines.0.qty`. */
function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property
    const own = Object.values(e.constraints ?? {}).map((message) => ({ field, message }))
    return [...own, ...flatten(e.children ?? [], field)]
  })
}

/**
 * Unknown fields are rejected rather than silently dropped, so a client typo ("qnty")
 * fails loudly instead of being ignored.
 */
export const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
  exceptionFactory: (errors) => new ValidationException(flatten(errors)),
})
