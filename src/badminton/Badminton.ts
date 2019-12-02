import { IBadminton } from './IBadminton.interface';
import { IConfigurationService } from '../configuration/IConfigurationService.interface';
import { IDatabaseService } from '../database/IDatabaseService.interface';
import { ITelegramService } from '../telegram/ITelegramService.interface';

import { IMessageBody } from '../common/model/IMessageBody.interface';
import { ICallbackMessageBody } from '../common/model/ICallbackMessageBody.interface';

export class Badminton implements IBadminton {
  constructor(
    private readonly configurationService: IConfigurationService,
    private readonly databaseService: IDatabaseService,
    private readonly telegramService: ITelegramService,
  ) {
    this.configurationService = configurationService;
    this.databaseService = databaseService;
    this.telegramService = telegramService;
  }

  async process(message: string): Promise<boolean> {
    let messageParsed: any;

    try {
      messageParsed = JSON.parse(message);
    } catch (error) {
      console.error('Error parsing user message: ', error.message);
      return false;
    }

    if (messageParsed['callback_query']) {
      return await this.processCallbackMessage(messageParsed as ICallbackMessageBody);
    }

    return await this.processMessage(messageParsed as IMessageBody);
  }

  private async processMessage(messageParsed: IMessageBody): Promise<boolean> {
    const { channelId } = this.configurationService.getConfiguration();

    const {
      message: {
        text: messageTextDirty,
        chat: { id: chatId },
        from: { first_name: firstName },
      },
    } = messageParsed;

    if (chatId !== channelId) {
      return true;
    }

    const playRegExp = new RegExp(/.*[0-9].*?.*/, 'gm');

    const messageText = messageTextDirty.trim().toLowerCase();

    console.log(messageText);
    console.log(playRegExp.test(messageText));

    const text = `${firstName} invites to play today\n\nplay: \n\nskip: \n\npay: `;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: 'play', callback_data: 'play' },
          { text: 'skip', callback_data: 'skip' },
          { text: 'pay', callback_data: 'pay' },
          { text: 'free', callback_data: 'free' },
        ],
      ],
    };

    try {
      await this.telegramService.sendMessage({ replyMarkup: JSON.stringify(replyMarkup), text, chatId });
    } catch (error) {
      console.error('Error sending telegram message: ', error.message);
      return false;
    }

    return true;
  }

  private async processCallbackMessage(messageParsed: ICallbackMessageBody): Promise<boolean> {
    console.log(messageParsed.callback_query.data);
    console.log(messageParsed.callback_query.from.username);

    const {
      callback_query: {
        data,
        message: {
          text,
          message_id: messageId,
          chat: { id: chatId },
          reply_markup: replyMarkup,
        },
        from: { username },
      },
    } = messageParsed;

    const textArray = text.split('\n\n');
    const play = textArray[1]
      .replace('play: ', '')
      .split(', ')
      .filter(v => v);
    const skip = textArray[2]
      .replace('skip: ', '')
      .split(', ')
      .filter(v => v);
    let pay = textArray[3].replace('pay: ', '');
    console.log(play, skip, pay);

    switch (data) {
      case 'play':
        // if
        play.push(username);
        break;
      case 'skip':
        // if
        skip.push(username);
        // code block
        break;
      case 'pay':
        // if
        pay = username;
        // code block
        break;
      default:
      // code block
    }

    console.log(play, skip, pay);
    const newText = `${textArray[0]}\n\nplay: ${play.join(', ')}\n\nskip: ${skip.join(', ')}\n\npay: ${pay}`;

    try {
      await this.telegramService.editMessageText({
        text: newText,
        chatId,
        messageId,
        replyMarkup: JSON.stringify(replyMarkup),
      });
    } catch (error) {
      console.error('Error sending telegram message: ', error.message);
      console.log(error);
      return false;
    }

    return true;
  }
}

//cancel message
