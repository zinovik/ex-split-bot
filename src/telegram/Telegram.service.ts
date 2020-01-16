import axios from 'axios';

import { ITelegramService } from './ITelegramService.interface';
import { IGetChatAdministratorsResult } from './IGetChatAdministratorsResult.interface';
import { ISendMessageResult } from './ISendMessageResult.interface';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

export class TelegramService implements ITelegramService {
  constructor(private readonly token: string) {
    this.token = token;
  }

  async sendMessage({
    text,
    replyMarkup,
    chatId,
  }: {
    text: string;
    replyMarkup: string;
    chatId: string | number;
  }): Promise<number> {
    const message = {
      text,
      reply_markup: replyMarkup,
      chat_id: chatId,
      disable_notification: true,
      parse_mode: 'Markdown',
    };

    console.log(`Sending telegram message: ${JSON.stringify(message)}...`);

    const { data }: { data: ISendMessageResult } = await axios.post(
      `${TELEGRAM_API_URL}${this.token}/sendMessage`,
      message,
    );

    console.log(`Telegram message was successfully sent: ${JSON.stringify(data)}`);

    return data.result.message_id;
  }

  async answerCallback({ callbackQueryId, text }: { callbackQueryId: string; text?: string }): Promise<void> {
    const message = {
      callback_query_id: callbackQueryId,
      text,
    };

    console.log(`Sending telegram callback answer: ${JSON.stringify(message)}...`);

    const { data } = await axios.post(`${TELEGRAM_API_URL}${this.token}/answerCallbackQuery`, message);

    console.log(`Telegram callback answer was successfully sent: ${JSON.stringify(data)}`);
  }

  async editMessageText({
    chatId,
    messageId,
    text,
    replyMarkup,
  }: {
    chatId: string | number;
    messageId: string;
    text: string;
    replyMarkup: string;
  }): Promise<void> {
    const message = {
      text,
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
      parse_mode: 'Markdown',
    };

    console.log(`Editing telegram message: ${JSON.stringify(message)}...`);

    const { data } = await axios.post(`${TELEGRAM_API_URL}${this.token}/editMessageText`, message, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Telegram message was successfully edited: ${JSON.stringify(data)}`);
  }

  async getChatAdministratorsIds(chatId: string | number): Promise<number[]> {
    const message = {
      chat_id: chatId,
    };

    const { data }: { data: IGetChatAdministratorsResult } = await axios.post(
      `${TELEGRAM_API_URL}${this.token}/getChatAdministrators`,
      message,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const chatAdministratorsIds = data.result.map(admin => admin.user.id);

    return chatAdministratorsIds;
  }
}
