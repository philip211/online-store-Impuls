import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { CatalogModule } from '../catalog/catalog.module'
import { AccountController } from './account.controller'
import { AccountService } from './account.service'

@Module({
  imports: [AuthModule, CatalogModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
