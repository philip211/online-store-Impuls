import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import { Auth, type AuthUser, CurrentUser } from '../../common/auth'
import {
  CreateReviewDto,
  HelpfulDto,
  ReviewCreatedDto,
  ReviewDto,
  ReviewsQueryDto,
} from './dto/review.dto'
import { ReviewsService } from './reviews.service'

@ApiTags('Отзывы')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Опубликованные отзывы раздела или товара' })
  list(@Query() q: ReviewsQueryDto): Promise<ReviewDto[]> {
    return this.reviews.list(q)
  }

  @Post()
  @Auth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Новый отзыв (только покупатели товара; публикуется после модерации)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto): Promise<ReviewCreatedDto> {
    return this.reviews.create(user.id, dto)
  }

  @Post(':id/helpful')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отметить отзыв полезным' })
  helpful(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<HelpfulDto> {
    return this.reviews.markHelpful(user.id, id)
  }
}
