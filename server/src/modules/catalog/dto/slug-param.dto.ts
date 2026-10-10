import { Matches } from 'class-validator'

export class SlugParamDto {
  /** URL name of the product, e.g. sony-wh-1000xm5. */
  @Matches(/^[a-z0-9-]{1,120}$/, { message: 'Некорректный адрес товара' })
  slug: string
}
