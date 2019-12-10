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
    console.log(`New message: ${message}`);

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
    const { chatUsername: allowedChatUsername } = this.configurationService.getConfiguration();

    if (!messageParsed.message) {
      return false;
    }

    const {
      message: {
        text: messageTextDirty,
        chat: { username: messageChatUsername },
        from: { first_name: firstName, last_name: lastName, username, id: userId },
      },
    } = messageParsed;

    if (!messageTextDirty) {
      return false;
    }

    if (messageChatUsername !== allowedChatUsername) {
      return false;
    }

    const messageText = messageTextDirty.trim().toLowerCase();

    const playRegExp = new RegExp('[0-9].*[?]', 'gm');
    if (messageText !== 'game' && !playRegExp.test(messageText)) {
      return false;
    }

    const user = new User();
    user.id = userId;
    user.username = username;
    user.firstName = firstName;
    user.lastName = lastName;
    await this.databaseService.upsertUser(user);

    const result = await this.createGame({ userId, messageChatUsername, username, firstName, lastName });
    return result;
  }

  private async createGame({
    userId,
    messageChatUsername,
    username,
    firstName,
    lastName,
  }: {
    userId: number;
    messageChatUsername: string;
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

    const text = this.messageService.getGameMessageText({
      gameId: game.id,
      createdByUserMarkdown: this.messageService.getUserMarkdown(game.createdBy),
      playUsers: game.playUsers,
      payByUserMarkdown: game.payBy ? this.messageService.getUserMarkdown(game.createdBy) : '',
      isFree: game.isFree,
      gameBalances: [{ userMarkdown: this.messageService.getUserMarkdown(user), gameBalance: 0 }],
    });

    const replyMarkup = this.messageService.getReplyMarkup();

    try {
      await this.telegramService.sendMessage({
        replyMarkup: JSON.stringify(replyMarkup),
        text,
        chatId: `@${messageChatUsername}`,
      });
    } catch (error) {
      console.error('Error sending telegram message: ', error.message);
      console.error('Error sending telegram message: ', error.response.data.description);
      return false;
    }

    return true;
  }

  private async processCallbackMessage(messageParsed: ICallbackMessageBody): Promise<boolean> {
    const { adminIds } = this.configurationService.getConfiguration();

    const {
      callback_query: {
        id: callbackQueryId,
        data,
        message: {
          text,
          message_id: messageId,
          chat: { id: chatId },
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

    const gameId = this.messageService.parseGameId(text);
    let game = await this.databaseService.getGame(gameId);

    console.log(`Current game: ${JSON.stringify(game)}`);

    if (game.isDone && !adminIds.includes(userId)) {
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

          break;
        }

        await this.databaseService.addPlayUser(gameId, userId);
        game.playUsers.push(user);

        break;

      case 'pay':
        if (game.isFree) {
          await this.telegramService.answerCallback({ callbackQueryId, text: 'You can not pay in free game!' });
          return false;
        }

        if (game.payBy && game.payBy.id === userId) {
          await this.databaseService.updatePayBy(gameId, null);
          game.payBy = null;

          break;
        }

        await this.databaseService.updatePayBy(gameId, userId);
        game.payBy = user;

        if (!game.playUsers.some(u => u.id === userId)) {
          await this.databaseService.addPlayUser(gameId, userId);
          game.playUsers.push(user);
        }

        break;

      case 'free':
        if (game.isFree) {
          await this.databaseService.notFreeGame(gameId);
          game.isFree = false;

          break;
        }

        await this.databaseService.freeGame(gameId);
        await this.databaseService.updatePayBy(gameId, null);
        game.isFree = true;
        game.payBy = null;

        break;

      case 'done':
        if (!game.isFree && !game.payBy) {
          await this.telegramService.answerCallback({
            callbackQueryId,
            text: 'You can not done game if it is not free and nobody payed!',
          });
          return false;
        }

        if (game.createdBy.id !== user.id && !adminIds.includes(userId)) {
          await this.telegramService.answerCallback({ callbackQueryId, text: 'You can done only your own games!' });
          return false;
        }

        await this.databaseService.doneGame(gameId);
        game.isDone = true;

        break;

      case 'delete':
        if (game.createdBy.id !== user.id && !adminIds.includes(userId)) {
          await this.telegramService.answerCallback({ callbackQueryId, text: 'You can delete only your own games!' });
          return false;
        }

        const newText = this.messageService.getDeletedGameMessageText({
          gameId: game.id,
          createdByUserMarkdown: this.messageService.getUserMarkdown(game.createdBy),
        });

        const replyMarkup = this.messageService.getDeletedGameReplyMarkup();

        await this.telegramService.editMessageText({
          text: `${newText}`,
          chatId,
          messageId,
          replyMarkup: JSON.stringify(replyMarkup),
        });

        await this.telegramService.answerCallback({ callbackQueryId, text: 'Game was successfully deleted!' });

        return false;

      case 'edit':
        if (!game.isDone) {
          await this.telegramService.answerCallback({ callbackQueryId, text: 'You can edit only done game!' });
          return false;
        }

        if (!adminIds.includes(userId)) {
          await this.telegramService.answerCallback({ callbackQueryId, text: 'Only admin can do it!' });
          return false;
        }

        const gameBalances = this.getGameBalances(game);

        for (let i = 0; i < game.playUsers.length; i++) {
          await this.databaseService.setUserBalance(
            game.playUsers[i].id,
            Number(game.playUsers[i].balance) - gameBalances[i].gameBalance,
          );
        }

        await this.databaseService.doneGame(gameId);
        game.isDone = false;

        game = await this.databaseService.getGame(gameId);

        break;

      case 'restore':
        if (!adminIds.includes(userId)) {
          await this.telegramService.answerCallback({ callbackQueryId, text: 'Only admin can do it!' });
          return false;
        }

        break;

      default:
        return false;
    }

    const gameBalances = this.getGameBalances(game);

    if (game.isDone && !game.isFree) {
      for (let i = 0; i < game.playUsers.length; i++) {
        await this.databaseService.setUserBalance(
          game.playUsers[i].id,
          Number(game.playUsers[i].balance) + gameBalances[i].gameBalance,
        );
      }
    }

    const newText = this.messageService.getGameMessageText({
      gameId: game.id,
      createdByUserMarkdown: this.messageService.getUserMarkdown(game.createdBy),
      playUsers: game.playUsers,
      payByUserMarkdown: game.payBy ? this.messageService.getUserMarkdown(game.payBy) : '',
      isFree: game.isFree,
      gameBalances,
    });

    const replyMarkup = game.isDone
      ? this.messageService.getDoneGameReplyMarkup()
      : this.messageService.getReplyMarkup();

    try {
      await this.telegramService.editMessageText({
        text: `${newText}`,
        chatId,
        messageId,
        replyMarkup: JSON.stringify(replyMarkup),
      });

      await this.telegramService.answerCallback({ callbackQueryId, text: 'Game was successfully updated!' });
    } catch (error) {
      console.error('Error sending telegram message: ', error.message);
      console.error('Error sending telegram message: ', error.response.data.description);
      return false;
    }

    return true;
  }

  private getGameBalances({
    isFree,
    playUsers,
    price,
    payBy,
  }: {
    isFree: boolean;
    playUsers: { username?: string; firstName?: string; id: number }[];
    price: number;
    payBy?: { id: number } | null;
  }): { id: number; userMarkdown: string; gameBalance: number }[] {
    const gameCost = price / playUsers.length;

    if (isFree || !payBy) {
      return [];
    }

    const gameBalances = playUsers.map(u => {
      let userGameBalance = 0;

      if (payBy.id === u.id) {
        userGameBalance += price;
      }

      userGameBalance -= gameCost;

      return {
        id: u.id,
        userMarkdown: this.messageService.getUserMarkdown(u),
        gameBalance: userGameBalance,
      };
    });

    return gameBalances;
  }
}
