import { Transform } from 'class-transformer'
import { IsEmail, IsInt, IsString, Length, Min } from 'class-validator'

const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value

export class EmailDto {
  @Transform(lower)
  @IsEmail({}, { message: 'Похоже, в адресе опечатка' })
  email: string
}

export class RestockDto extends EmailDto {
  @IsInt()
  @Min(1)
  productId: number
}

export class TokenQueryDto {
  @IsString()
  @Length(20, 100)
  token: string
}

export class SubscribedDto {
  email: string
}

export class RestockSubscribedDto {
  productId: number
  email: string
}
