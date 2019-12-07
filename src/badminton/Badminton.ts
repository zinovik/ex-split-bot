import { IBadminton } from './IBadminton.interface';
import { IConfigurationService } from '../configuration/IConfigurationService.interface';
import { IDatabaseService } from '../database/IDatabaseService.interface';
import { ITelegramService } from '../telegram/ITelegramService.interface';
import { IMessageService } from '../message/IMessageService.interface';

import { IMessageBody } from '../common/model/IMessageBody.interface';
import { ICallbackMessageBody } from '../common/model/ICallbackMessageBody.interface';
import { User } from '../database/entities/User.entity';

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
    let messageParsed: any;

    try {
      messageParsed = JSON.parse(message);
    } catch (error) {
      console.error('Error parsing user message: ', error.message);
      return false;
    }

    if (messageParsed['callback_query']) {
      const result = await this.processCallbackMessage(messageParsed as ICallbackMessageBody);
      await this.databaseService.closeConnection();
      return result;
    }

    const result = await this.processInviteMessage(messageParsed as IMessageBody);
    await this.databaseService.closeConnection();
    return result;
  }

  private async processInviteMessage(messageParsed: IMessageBody): Promise<boolean> {
    const { groupIds } = this.configurationService.getConfiguration();

    const {
      message: {
        text: messageTextDirty,
        chat: { id: chatId },
        from: { first_name: firstName, last_name: lastName, username, id: userId },
      },
    } = messageParsed;

    if (!messageTextDirty) {
      return false;
    }

    if (!groupIds.includes(chatId)) {
      return false;
    }

    const user = new User();
    user.id = userId;
    user.username = username;
    user.firstName = firstName;
    user.lastName = lastName;
    await this.databaseService.upsertUser(user);

    const messageText = messageTextDirty.trim().toLowerCase();

    const playRegExp = new RegExp('[0-9].*[?]', 'gm');
    if (messageText !== 'game' && !playRegExp.test(messageText)) {
      return false;
    }

    const result = await this.createGame({ userId, chatId, username, firstName, lastName });
    return result;
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
    const user = new User();
    user.id = userId;
    user.username = username;
    user.firstName = firstName;
    user.lastName = lastName;

    const game = await this.databaseService.createGame(this.configurationService.getConfiguration().gameCost, user);

    const text = await this.messageService.getGameInvitation({
      gameId: game.id,
      createdByUsername: game.createdBy.username,
      playUsers: game.playUsers,
      payByUsername: game.payBy ? game.payBy.username : '',
      isFree: game.isFree,
      gameBalances: [{ username, gameBalance: 0 }],
    });

    const replyMarkup = await this.messageService.getReplyMarkup();

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
        from: { username, id: userId, first_name: firstName, last_name: lastName },
      },
    } = messageParsed;

    const user = new User();
    user.id = userId;
    user.username = username;
    user.firstName = firstName;
    user.lastName = lastName;
    await this.databaseService.upsertUser(user);
    user.balance = await this.databaseService.getUserBalance(userId);

    const gameId = await this.messageService.parseGameId(text);
    const game = await this.databaseService.getGame(gameId);

    if (game.isDone) {
      return false;
    }

    switch (data) {
      case 'play':
        if (game.playUsers.some(u => u.id === userId)) {
          await this.databaseService.removePlayUser(gameId, userId);

          game.playUsers = game.playUsers.filter(u => u.id !== userId);

          if (game.payBy && game.payBy.id === userId) {
            await this.databaseService.updatePayBy(gameId, null);

            game.payBy = null;
          }
        } else {
          await this.databaseService.addPlayUser(gameId, userId);

          game.playUsers.push(user);
        }
        break;

      case 'pay':
        if (!game.isFree) {
          if (game.payBy && game.payBy.id === userId) {
            await this.databaseService.updatePayBy(gameId, null);

            game.payBy = null;
          } else {
            await this.databaseService.updatePayBy(gameId, userId);

            game.payBy = user;

            if (!game.playUsers.some(u => u.id === userId)) {
              await this.databaseService.addPlayUser(gameId, userId);

              game.playUsers.push(user);
            }
          }
          break;
        }

      case 'free':
        if (game.isFree) {
          await this.databaseService.notFreeGame(gameId);

          game.isFree = false;
        } else {
          await this.databaseService.freeGame(gameId);
          await this.databaseService.updatePayBy(gameId, null);

          game.isFree = true;
          game.payBy = null;
        }
        break;

      case 'done':
        await this.databaseService.doneGame(gameId);

        game.isDone = true;
        break;

      case 'delete':
        if (game.createdBy.id !== user.id) {
          return false;
        }

        await this.databaseService.removeGame(gameId);
        await this.telegramService.deleteMessage({ chatId, messageId });

        return false;

      default:
        return false;
    }

    const playersNumber = game.playUsers.length;
    const gameCost = game.price / playersNumber;

    const gameBalances = game.isFree
      ? []
      : game.playUsers.map(u => {
          let userGameBalance = 0;

          if (game.payBy && game.payBy.username === u.username) {
            userGameBalance += game.price;
          }

          userGameBalance -= gameCost;

          return {
            id: u.id,
            username: u.username,
            gameBalance: userGameBalance,
          };
        });

    if (game.isDone && !game.isFree) {
      for (let i = 0; i < game.playUsers.length; i++) {
        await this.databaseService.setUserBalance(
          game.playUsers[i].id,
          Number(game.playUsers[i].balance) + gameBalances[i].gameBalance,
        );
      }
    }

    const newText = await this.messageService.getGameInvitation({
      gameId: game.id,
      createdByUsername: game.createdBy.username,
      playUsers: game.playUsers,
      payByUsername: game.payBy ? game.payBy.username : '',
      isFree: game.isFree,
      gameBalances,
    });

    try {
      await this.telegramService.editMessageText({
        text: `${newText}`,
        chatId,
        messageId,
        replyMarkup: game.isDone ? '' : JSON.stringify(replyMarkup),
      });
    } catch (error) {
      console.error('Error sending telegram message: ', error.message);
      return false;
    }

    return true;
  }
}
