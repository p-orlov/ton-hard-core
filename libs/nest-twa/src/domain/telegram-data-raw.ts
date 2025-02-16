export type TelegramDataRaw = Readonly<{
  query_id?: string;
  user?: string;
  // receiver: WebAppUser
  // chat	WebAppChat
  // chat_type?: string;
  // chat_instance?: string;
  // start_param?: string;
  // can_send_after?: number;
  auth_date: string;
  hash: string;
}>;

export const TelegramDataRaw = {
  fromToken: (token: string): TelegramDataRaw => {
    const data = atob(token);

    const params = new URLSearchParams(data);

    const parsed = Object.fromEntries(params);

    return {
      auth_date: parsed['auth_date'],
      hash: parsed['hash'],
      user: parsed['user'],
      query_id: parsed['query_id']
    };
  }
};
