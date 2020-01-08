export interface IGetChatAdministratorsResult {
  ok: boolean;
  result: {
    user: {
      id: number;
      is_bot: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code: string;
    };
    status: string;
  }[];
}
