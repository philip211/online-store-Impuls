import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { Auth, type AuthUser, CurrentUser } from '../../common/auth'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { AuthService } from '../auth/auth.service'
import { UserDto } from '../auth/dto/auth.dto'
import { ProductDto } from '../catalog/dto/product.dto'
import { OrderNumberParamDto } from '../orders/dto/order.dto'
import { AccountService } from './account.service'
import {
  AccountOrderDto,
  CartDto,
  ChangePasswordDto,
  OrderPageDto,
  ProductIdsDto,
  ReplaceCartDto,
  UpdateProfileDto,
} from './dto/account.dto'

@ApiTags('Личный кабинет')
@Auth()
@Controller('me')
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Профиль' })
  profile(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return this.account.profile(user.id)
  }

  @Patch()
  @ApiOperation({ summary: 'Изменить имя или телефон' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<UserDto> {
    return this.account.updateProfile(user.id, dto)
  }

  @Post('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Сменить пароль. Все сессии завершаются — нужно войти заново' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword)
  }

  @Get('orders')
  @ApiOperation({ summary: 'Мои заказы, новые сначала' })
  orders(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto): Promise<OrderPageDto> {
    return this.account.orders(user.id, q)
  }

  @Get('orders/:number')
  @ApiOperation({ summary: 'Мой заказ' })
  order(
    @CurrentUser() user: AuthUser,
    @Param() { number }: OrderNumberParamDto,
  ): Promise<AccountOrderDto> {
    return this.account.order(user.id, number)
  }

  @Get('wishlist')
  @ApiOperation({ summary: 'Избранное' })
  wishlist(@CurrentUser() user: AuthUser): Promise<ProductDto[]> {
    return this.account.wishlist(user.id)
  }

  @Put('wishlist/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Добавить в избранное (повтор — без изменений)' })
  async addToWishlist(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.account.addToWishlist(user.id, id)
  }

  @Delete('wishlist/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Убрать из избранного' })
  async removeFromWishlist(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.account.removeFromWishlist(user.id, id)
  }

  @Post('wishlist/merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Объединить локальное избранное гостя с избранным аккаунта' })
  mergeWishlist(@CurrentUser() user: AuthUser, @Body() dto: ProductIdsDto): Promise<ProductDto[]> {
    return this.account.mergeWishlist(user.id, dto.productIds)
  }

  @Get('cart')
  @ApiOperation({ summary: 'Корзина аккаунта с актуальными ценами' })
  cart(@CurrentUser() user: AuthUser): Promise<CartDto> {
    return this.account.cart(user.id)
  }

  @Put('cart')
  @ApiOperation({ summary: 'Заменить корзину целиком (синхронизация между устройствами)' })
  replaceCart(@CurrentUser() user: AuthUser, @Body() dto: ReplaceCartDto): Promise<CartDto> {
    return this.account.replaceCart(user.id, dto)
  }
}
