export interface ITelegramService {
  sendMessage({
    text,
    replyMarkup,
    chatId,
  }: {
    text: string;
    replyMarkup: string;
    chatId: string | number;
  }): Promise<number>;

  answerCallback({ callbackQueryId, text }: { callbackQueryId: string; text?: string }): Promise<void>;

  editMessageText({
    chatId,
    messageId,
    text,
    replyMarkup,
  }: {
    chatId: string | number;
    messageId: number;
    text: string;
    replyMarkup: string;
  }): Promise<void>;

  getChatAdministratorsIds(chatId: string | number): Promise<number[]>;
}
