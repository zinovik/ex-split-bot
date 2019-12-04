import { IBadminton } from './IBadminton.interface';
import { IConfigurationService } from '../configuration/IConfigurationService.interface';
import { IDatabaseService } from '../database/IDatabaseService.interface';
import { ITelegramService } from '../telegram/ITelegramService.interface';
import { IMessageService } from '../message/IMessageService.interface';

import { IMessageBody } from '../common/model/IMessageBody.interface';
import { ICallbackMessageBody } from '../common/model/ICallbackMessageBody.interface';

const GAME_COST = 6;

export class Badminton implements IBadminton {
  constructor(
    private readonly configurationService: IConfigurationService,
    private readonly databaseService: IDatabaseService,
    private readonly telegramService: ITelegramService,
    private readonly messageService: IMessageService,
  ) {
    this.configurationService = configurationService;
    this.databaseService = databaseService;
    this.telegramService = telegramService;
    this.messageService = messageService;
  }

  async processMessage(message: string): Promise<boolean> {
    this.databaseService.getUserBalance(123);
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

    return await this.processInviteMessage(messageParsed as IMessageBody);
  }

  private async processInviteMessage(messageParsed: IMessageBody): Promise<boolean> {
    const { channelId } = this.configurationService.getConfiguration();

    const {
      message: {
        text: messageTextDirty,
        chat: { id: chatId },
        from: { first_name: firstName, last_name: lastName, username, id: userId },
      },
    } = messageParsed;

    if (chatId !== channelId) {
      return false;
    }

    const messageText = messageTextDirty.trim().toLowerCase();

    if (messageText === 'cancel') {
      // TODO: cancel invite
    }

    const playRegExp = new RegExp(/.*[0-9].*?.*/, 'gm');
    if (!playRegExp.test(messageText)) {
      return false;
    }

    return await this.createGame({ userId, chatId, username, firstName, lastName });
  }

  private async createGame({
    userId,
    chatId,
    username,
    firstName,
    lastName,
  }: {
    userId: number;
    chatId: number;
    username: string;
    firstName: string;
    lastName: string;
  }): Promise<boolean> {
    await this.databaseService.createGame({
      userId,
      price: 6,
      username,
      firstName,
      lastName,
    });
    return false;

    const text = `${username} invites to play today!\n\nplay: ${username}\n\nskip: \n\npay: ${username}`;

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
    let playUsers = textArray[1]
      .replace('play: ', '')
      .split(', ')
      .filter(v => v);
    let skipUsers = textArray[2]
      .replace('skip: ', '')
      .split(', ')
      .filter(v => v);
    let payUser = textArray[3].replace('pay: ', '').replace('pay:', '');

    switch (data) {
      case 'play':
        if (playUsers.includes(username)) {
          playUsers = playUsers.filter(playUser => playUser !== username);

          if (payUser === username) {
            payUser = '';
          }
        } else {
          playUsers.push(username);

          skipUsers = skipUsers.filter(skipUser => skipUser !== username);
        }
        break;

      case 'skip':
        if (skipUsers.includes(username)) {
          skipUsers = skipUsers.filter(skipUser => skipUser !== username);
        } else {
          skipUsers.push(username);

          playUsers = playUsers.filter(playUser => playUser !== username);

          if (payUser === username) {
            payUser = '';
          }
        }
        break;

      case 'pay':
        if (payUser === username) {
          payUser = '';
        } else {
          payUser = username;

          if (!playUsers.includes(username)) {
            playUsers.push(username);
          }
        }
        break;

      case 'free':
        payUser = 'free';
        break;

      default:
        return false;
    }

    const newText = `${textArray[0]}\n\nplay: ${playUsers.join(', ')}\n\nskip: ${skipUsers.join(', ')}\n\npay: ${payUser}`;

    const playersNumber = playUsers.length;
    const gameCost = GAME_COST / playersNumber;
    let balances = '\n\nBalances:';

    for (let i = 0; i < playUsers.length; i++) {
      const userBalance = await this.databaseService.getUserBalance(playUsers[i]);
      let userPay = 0;

      if (payUser) {
        if (payUser === playUsers[i]) {
          userPay += GAME_COST;
        }

        userPay -= gameCost;
      }

      await this.databaseService.setUserBalance(playUsers[i], userBalance + userPay);

      balances += `\n${playUsers[i]}: ${userBalance + userPay} (${userPay})`;
    }

    try {
      await this.telegramService.editMessageText({
        text: `${newText}${balances}`,
        chatId,
        messageId,
        replyMarkup: JSON.stringify(replyMarkup),
      });
    } catch (error) {
      console.error('Error sending telegram message: ', error.message);
      return false;
    }

    return true;
  }
}
