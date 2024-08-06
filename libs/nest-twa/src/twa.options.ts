import { Injectable } from '@nestjs/common';

export const TWA_OPTIONS = 'TWA_OPTIONS';

@Injectable()
export class TwaOptions {
  constructor(public readonly token: string) {}
}
