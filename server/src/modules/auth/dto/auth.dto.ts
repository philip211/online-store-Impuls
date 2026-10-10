import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

import { Role } from '../../../../generated/prisma/client'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)
const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value

/** At least 8 characters with a letter and a digit; long passphrases are welcome. */
export const PASSWORD_RULE = /^(?=.*\p{L})(?=.*\d).{8,128}$/u
const PASSWORD_MESSAGE = 'Пароль: от 8 символов, хотя бы одна буква и одна цифра'

export class RegisterDto {
  @Transform(lower)
  @IsEmail({}, { message: 'Похоже, в адресе опечатка' })
  @MaxLength(254)
  email: string

  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password: string

  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Напишите, как к вам обращаться' })
  @MaxLength(80)
  name: string

  /** Any format; stored as 11 digits starting with 7. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string
}

export class LoginDto {
  @Transform(lower)
  @IsEmail()
  @MaxLength(254)
  email: string

  @IsString()
  @MaxLength(128)
  password: string
}

export class UserDto {
  id: string
  email: string
  name: string
  @ApiProperty({ type: String, nullable: true, description: '11 цифр, начинается с 7' })
  phone: string | null
  @ApiProperty({ enum: Role })
  role: Role
  createdAt: Date
}

export class AuthResponseDto {
  /** Short-lived JWT: send as `Authorization: Bearer …`. */
  accessToken: string
  /** Access token lifetime, seconds. */
  expiresIn: number
  user: UserDto
}
