import { UseGuards, UseInterceptors, applyDecorators } from '@nestjs/common';

import { TelegramTokenGuard } from '../guards';
import { TelegramUserInterceptor } from '../interceptors';

export const WithTelegramUser = () =>
  applyDecorators(
    UseGuards(TelegramTokenGuard),
    UseInterceptors(TelegramUserInterceptor)
  );
