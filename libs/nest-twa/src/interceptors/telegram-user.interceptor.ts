import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';

import { TelegramData } from '../domain';
import { RequestHelper } from '../request.helper';

@Injectable()
export class TelegramUserInterceptor implements NestInterceptor {
  public intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const token = RequestHelper.getBearerToken(request);

    const telegramDataRaw = TelegramData.fromToken(token!); // TODO: handle undefined
    request.user = telegramDataRaw.user!; // TODO: handle undefined

    return next.handle();
  }
}
