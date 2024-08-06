import { camelCase } from 'lodash';

export type TelegramUser = Readonly<{
  id: number;
  isBot?: boolean;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode: string;
  isPremium?: boolean;
  addedToAttachmentMenu?: boolean;
  allowsWriteToPm?: boolean;
  photoUrl?: string;
}>;

export const TelegramUser = {
  fromJSON: (json: string): TelegramUser => {
    const parsed = JSON.parse(json);

    return Object.keys(parsed).reduce((acc: Partial<TelegramUser>, key) => {
      const camelKey = camelCase(key);

      return {
        ...acc,
        [camelKey]: parsed[key]
      };
    }, {}) as TelegramUser; // TODO: handle invalid data
  }
};
