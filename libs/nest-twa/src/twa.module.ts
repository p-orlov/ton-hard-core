import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { TwaOptions } from './twa.options';
import { TwaService } from './twa.service';

@Module({
  controllers: [],
  exports: [TwaService],
  imports: [ConfigModule],
  providers: [
    {
      inject: [ConfigService],
      provide: TwaOptions,
      useFactory(configService: ConfigService) {
        return new TwaOptions(
          configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN')
        );
      }
    },
    TwaService
  ]
})
export class TwaModule {}
