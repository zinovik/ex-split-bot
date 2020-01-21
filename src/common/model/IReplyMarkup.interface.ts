export interface IReplyMarkup {
  inline_keyboard: Array<
    Array<{
      text: string;
      callback_data: string;
    }>
  >;
}
