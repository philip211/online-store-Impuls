import { Global, Module } from '@nestjs/common'
import { config } from 'dotenv'

import { Env, validateEnv } from './env'

/**
 * Validated configuration, injectable as `Env`. Real environment variables win over .env,
 * so containers and CI configure the app without touching files.
 */
@Global()
@Module({
  providers: [
    {
      provide: Env,
      useFactory: () => {
        config({ quiet: true })
        return validateEnv(process.env)
      },
    },
  ],
  exports: [Env],
})
export class EnvModule {}
