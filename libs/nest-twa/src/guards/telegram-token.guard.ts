import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { TwaService } from '../twa.service';
import { RequestHelper } from '../request.helper';

@Injectable()
export class TelegramTokenGuard implements CanActivate {
  constructor(private readonly twaService: TwaService) {}

  public canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = RequestHelper.getBearerToken(request);

    return !!token && this.twaService.validateData(token);
  }
}
