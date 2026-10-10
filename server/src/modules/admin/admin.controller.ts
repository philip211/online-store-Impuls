import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { memoryStorage } from 'multer'

import { ErrorCode, unprocessable } from '../../common/errors'

import { Auth, type AuthUser, CurrentUser, Role, STAFF } from '../../common/auth'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { UserDto } from '../auth/dto/auth.dto'
import { OrderNumberParamDto } from '../orders/dto/order.dto'
import { AdminCatalogService } from './admin-catalog.service'
import { AdminSalesService } from './admin-sales.service'
import { AdminUsersService } from './admin-users.service'
import { MediaService } from './media.service'
import {
  AdminProductDto,
  AdminProductPageDto,
  AdminProductsQueryDto,
  CreateProductDto,
  StockDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UploadedPhotoDto,
} from './dto/admin-product.dto'
import {
  AdminOrderDto,
  AdminOrderPageDto,
  AdminOrdersQueryDto,
  AdminReturnPageDto,
  AdminReturnsQueryDto,
  AdminReviewPageDto,
  AdminReviewsQueryDto,
  AdminUserPageDto,
  AdminUsersQueryDto,
  AuditPageDto,
  ChangeOrderStatusDto,
  ChangeRoleDto,
  ModerateReviewDto,
  StatsDto,
  UpdateReturnDto,
} from './dto/admin.dto'

@ApiTags('Админка: каталог')
@Auth(...STAFF)
@Controller('admin')
export class AdminCatalogController {
  constructor(
    private readonly catalog: AdminCatalogService,
    private readonly media: MediaService,
  ) {}

  @Post('media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({
    summary: 'Загрузить фото товара (до 15 МБ): вернёт метаданные для поля images',
    description: 'Фото перекодируется в AVIF и WebP шести ширин, как в медиа-конвейере витрины.',
  })
  async upload(@UploadedFile() file: Express.Multer.File | undefined): Promise<UploadedPhotoDto> {
    if (!file) throw unprocessable(ErrorCode.ValidationFailed, 'Прикрепите файл в поле file')
    return this.media.process(file.buffer)
  }

  @Get('products')
  @ApiOperation({ summary: 'Товары, включая снятые с продажи' })
  list(@Query() q: AdminProductsQueryDto): Promise<AdminProductPageDto> {
    return this.catalog.list(q)
  }

  @Get('products/:id')
  get(@Param('id', ParseIntPipe) id: number): Promise<AdminProductDto> {
    return this.catalog.get(id)
  }

  @Post('products')
  @ApiOperation({ summary: 'Новый товар' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto): Promise<AdminProductDto> {
    return this.catalog.create(user.id, dto)
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Изменить товар (только переданные поля; images заменяются целиком)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ): Promise<AdminProductDto> {
    return this.catalog.update(user.id, id, dto)
  }

  @Patch('products/:id/stock')
  @ApiOperation({ summary: 'Остаток: новое значение или изменение (приход, списание)' })
  stock(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StockDto,
  ): Promise<AdminProductDto> {
    return this.catalog.setStock(user.id, id, dto)
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Снять с продажи (товар остаётся в истории заказов)' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.catalog.deactivate(user.id, id)
  }

  @Get('categories')
  categories() {
    return this.catalog.categories()
  }

  @Patch('categories/:id')
  updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalog.updateCategory(user.id, id, dto)
  }
}

@ApiTags('Админка: продажи')
@Auth(...STAFF)
@Controller('admin')
export class AdminSalesController {
  constructor(private readonly sales: AdminSalesService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Сводка: заказы, выручка, что ждёт внимания' })
  stats(): Promise<StatsDto> {
    return this.sales.stats()
  }

  @Get('orders')
  @ApiOperation({ summary: 'Заказы с фильтрами и поиском' })
  orders(@Query() q: AdminOrdersQueryDto): Promise<AdminOrderPageDto> {
    return this.sales.orders(q)
  }

  @Get('orders/:number')
  @ApiOperation({ summary: 'Заказ: история статусов, платежи, доступные переходы' })
  order(@Param() { number }: OrderNumberParamDto): Promise<AdminOrderDto> {
    return this.sales.order(number)
  }

  @Patch('orders/:number/status')
  @ApiOperation({
    summary: 'Сменить статус. Отмена возвращает остаток и деньги за оплаченный заказ',
  })
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param() { number }: OrderNumberParamDto,
    @Body() dto: ChangeOrderStatusDto,
  ): Promise<AdminOrderDto> {
    return this.sales.changeOrderStatus(user.id, number, dto)
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Отзывы для модерации' })
  reviews(@Query() q: AdminReviewsQueryDto): Promise<AdminReviewPageDto> {
    return this.sales.reviews(q)
  }

  @Patch('reviews/:id')
  @ApiOperation({ summary: 'Опубликовать или отклонить отзыв' })
  moderate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.sales.moderateReview(user.id, id, dto)
  }

  @Get('returns')
  @ApiOperation({ summary: 'Заявки на возврат' })
  returns(@Query() q: AdminReturnsQueryDto): Promise<AdminReturnPageDto> {
    return this.sales.returns(q)
  }

  @Patch('returns/:id')
  @ApiOperation({ summary: 'Сменить статус заявки на возврат' })
  updateReturn(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReturnDto,
  ) {
    return this.sales.updateReturn(user.id, id, dto)
  }
}

/** People and permissions: administrators only. */
@ApiTags('Админка: пользователи')
@Auth(Role.ADMIN)
@Controller('admin')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get('users')
  list(@Query() q: AdminUsersQueryDto): Promise<AdminUserPageDto> {
    return this.users.list(q)
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Сменить роль. Сессии пользователя завершаются' })
  changeRole(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeRoleDto,
  ): Promise<UserDto> {
    return this.users.changeRole(user.id, id, dto)
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Журнал действий сотрудников' })
  audit(@Query() q: PaginationQueryDto): Promise<AuditPageDto> {
    return this.users.auditLog(q)
  }
}
