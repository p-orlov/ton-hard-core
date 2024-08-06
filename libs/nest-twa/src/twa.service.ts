import { createHmac, timingSafeEqual } from 'crypto';

import { Injectable } from '@nestjs/common';

import { TelegramDataRaw } from './domain';

import { TwaOptions } from './twa.options';

@Injectable()
export class TwaService {
  constructor(private readonly options: TwaOptions) {}

  public validateData(dataBase64: string): boolean {
    const data = TelegramDataRaw.fromToken(dataBase64);

    const { hash, ...other } = data;

    if (!hash) {
      return false;
    }

    const originalHash = Buffer.from(hash, 'hex');
    const checkString = Object.keys(other)
      .sort()
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- todo
      // @ts-ignore
      .map(key => `${key}=${other[key]}`)
      .join('\n');

    const hmacKey = createHmac('sha256', 'WebAppData')
      .update(Buffer.from(this.options.token, 'utf8'))
      .digest();
    const hmac = createHmac('sha256', hmacKey);
    hmac.update(checkString);
    const computedHash = hmac.digest();

    return timingSafeEqual(computedHash, originalHash);
  }
}
