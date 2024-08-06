import { TelegramUser } from './telegram-user';
import { TelegramDataRaw } from './telegram-data-raw';

export type TelegramData = Readonly<{
  user: TelegramUser;
}>;

export const TelegramData = {
  fromToken: (token: string): TelegramData => {
    const tgDataRaw = TelegramDataRaw.fromToken(token);
    const user = TelegramUser.fromJSON(tgDataRaw.user!); // TODO: handle undefined

    return {
      user
    };
  }
};
