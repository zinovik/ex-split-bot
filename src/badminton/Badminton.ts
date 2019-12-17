import { IBadminton } from './IBadminton.interface';
import { IConfigurationService } from '../configuration/IConfigurationService.interface';
import { IDatabaseService } from '../database/IDatabaseService.interface';
import { ITelegramService } from '../telegram/ITelegramService.interface';
import { IMessageService } from '../message/IMessageService.interface';

import { IMessageBody } from '../common/model/IMessageBody.interface';
import { ICallbackMessageBody } from '../common/model/ICallbackMessageBody.interface';
import { Game } from '../database/entities/Game.entity';

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

  async processMessage(notParsedMessage: string): Promise<void> {
    console.log(`New message: ${notParsedMessage}`);

    let message: IMessageBody | ICallbackMessageBody;

    try {
      message = JSON.parse(notParsedMessage);
    } catch (error) {
      console.error('Error parsing user message: ', error.message);
      return;
    }

    if (this.isCallbackMessage(message)) {
      await this.processCallbackMessage(message as ICallbackMessageBody);
    } else {
      await this.processGroupMessage(message as IMessageBody);
    }

    await this.databaseService.closeConnection();
  }

  private isCallbackMessage(message: IMessageBody | ICallbackMessageBody): boolean {
    return 'callback_query' in message;
  }

  private async processGroupMessage(messageBody: IMessageBody): Promise<void> {
    const { chatUsername: allowedChatUsername, gameCost } = this.configurationService.getConfiguration();

    const {
      message: {
        text,
        chat: { username: messageChatUsername },
        from: { first_name: firstName, last_name: lastName, username, id: userId },
      },
    } = messageBody;

    if (!text) {
      console.error('No text!');
      return;
    }

    if (messageChatUsername !== allowedChatUsername) {
      console.error('Wrong channel!');
      return;
    }

    const messageText = text.trim().toLowerCase();

    const playRegExp = new RegExp('^game$|[0-9].*[?]', 'gm');
    if (!playRegExp.test(messageText)) {
      console.error('No keyword found!');
      return;
    }

    await this.databaseService.upsertUser({ id: userId, username, firstName, lastName });

    const gameId = await this.databaseService.createGame(gameCost, userId);
    const userBalance = await this.databaseService.getUserBalance(userId);

    await this.createGameMessage({
      gameId,
      userId,
      username,
      firstName,
      userBalance,
      messageChatUsername,
    });
  }

  private async createGameMessage({
    gameId,
    userId,
    username,
    firstName,
    userBalance,
    messageChatUsername,
  }: {
    gameId: number;
    userId: number;
    username?: string;
    firstName?: string;
    userBalance: number;
    messageChatUsername: string;
  }): Promise<void> {
    const userMarkdown = this.messageService.getUserMarkdown({ username, firstName, id: userId });

    const text = this.messageService.getGameMessageText({
      gameId,
      createdByUserMarkdown: userMarkdown,
      playUsers: [{ username, firstName, id: userId, balance: userBalance }],
      payByUserMarkdown: userMarkdown,
      gameBalances: [{ userMarkdown, gameBalance: 0 }],
    });

    const replyMarkup = this.messageService.getReplyMarkup(false);

    try {
      await this.telegramService.sendMessage({
        replyMarkup: JSON.stringify(replyMarkup),
        text,
        chatId: `@${messageChatUsername}`,
      });
    } catch (error) {
      console.error('Error sending telegram message: ', error.message);
      console.error('Error sending telegram message: ', error.response.data.description);
    }
  }

  private async processCallbackMessage(messageParsed: ICallbackMessageBody): Promise<void> {
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

    await this.databaseService.upsertUser({ id: userId, username, firstName, lastName });

    const gameId = this.messageService.parseGameId(text);
    const game = await this.databaseService.getGame(gameId);

    console.log(`Current game: ${JSON.stringify(game)}`);

    switch (data) {
      case 'play':
        await this.playGame(game, userId);
        break;

      case 'pay':
        await this.payGame(game, userId);
        break;

      case 'free':
        await this.freeGame(game);
        break;

      case 'done': {
        const doneFailMessage = await this.doneGame(game, userId, adminIds);
        if (doneFailMessage) {
          await this.telegramService.answerCallback({ callbackQueryId, text: doneFailMessage });
          return;
        }
        break;
      }

      case 'delete': {
        const deleteFailMessage = await this.deleteGame(game, userId, adminIds);
        if (deleteFailMessage) {
          await this.telegramService.answerCallback({ callbackQueryId, text: deleteFailMessage });
          return;
        }
        break;
      }

      case 'restore': {
        const restoreFailMessage = await this.restoreGame(game, userId, adminIds);
        if (restoreFailMessage) {
          await this.telegramService.answerCallback({ callbackQueryId, text: restoreFailMessage });
          return;
        }
        break;
      }

      case 'edit': {
        const editFailMessage = await this.editGame(game, userId, adminIds);
        if (editFailMessage) {
          await this.telegramService.answerCallback({ callbackQueryId, text: editFailMessage });
          return;
        }
        break;
      }

      default:
        return;
    }

    const updatedGame = await this.databaseService.getGame(gameId);

    const gameBalances = this.getGameBalances(updatedGame);

    await this.updateGameMessage({
      game: data === 'done' ? ({ ...updatedGame, playUsers: game.playUsers } as Game) : updatedGame,
      chatId,
      messageId,
      callbackQueryId,
      gameBalances,
    });
  }

  private async playGame(game: Game, userId: number): Promise<void> {
    if (game.isDeleted || game.isDone) {
      throw new Error('You can not play deleted or done game');
    }

    if (game.playUsers.some(u => u.id === userId)) {
      await this.databaseService.removePlayUser(game.id, userId);

      if (game.payBy && game.payBy.id === userId) {
        await this.databaseService.updatePayBy(game.id, null);
      }

      return;
    }

    await this.databaseService.addPlayUser(game.id, userId);
  }

  private async payGame(game: Game, userId: number): Promise<void> {
    if (game.isDeleted || game.isDone || game.isFree) {
      throw new Error('You can not play deleted, done or free game');
    }

    if (game.payBy && game.payBy.id === userId) {
      await this.databaseService.updatePayBy(game.id, null);

      return;
    }

    await this.databaseService.updatePayBy(game.id, userId);

    if (!game.playUsers.some(u => u.id === userId)) {
      await this.databaseService.addPlayUser(game.id, userId);
    }
  }

  private async freeGame(game: Game): Promise<void> {
    if (game.isDeleted || game.isDone) {
      throw new Error('You can not free deleted or done game');
    }

    if (game.isFree) {
      await this.databaseService.notFreeGame(game.id);

      return;
    }

    await this.databaseService.freeGame(game.id);
    await this.databaseService.updatePayBy(game.id, null);
  }

  private async doneGame(game: Game, userId: number, adminIds: number[]): Promise<string | void> {
    if (game.isDeleted || game.isDone) {
      throw new Error('You can not done deleted or done game');
    }

    if (!game.isFree && !game.payBy) {
      return 'You can not done game if it is not free and nobody payed!';
    }

    if (game.createdBy.id !== userId && !adminIds.includes(userId)) {
      return 'You can done only your own games!';
    }

    if (!game.isFree) {
      const gameBalances = this.getGameBalances(game);

      for (let i = 0; i < game.playUsers.length; i++) {
        await this.databaseService.setUserBalance(
          game.playUsers[i].id,
          Number(game.playUsers[i].balance) + gameBalances[i].gameBalance,
        );
      }
    }

    await this.databaseService.doneGame(game.id);
  }

  private async deleteGame(game: Game, userId: number, adminIds: number[]): Promise<string | void> {
    if (game.isDeleted || game.isDone) {
      throw new Error('You can not delete deleted or done game');
    }

    if (game.createdBy.id !== userId && !adminIds.includes(userId)) {
      return 'You can delete only your own games!';
    }

    await this.databaseService.deleteGame(game.id);
  }

  private async restoreGame(game: Game, userId: number, adminIds: number[]): Promise<string | void> {
    if (!game.isDeleted || game.isDone) {
      throw new Error('You can not restore not deleted or done game');
    }

    if (!adminIds.includes(userId)) {
      return 'Only admin can do it!';
    }

    await this.databaseService.restoreGame(game.id);
  }

  private async editGame(game: Game, userId: number, adminIds: number[]): Promise<string | void> {
    if (game.isDeleted || !game.isDone) {
      throw new Error('You can not edit deleted or not done game');
    }

    if (!game.isDone) {
      return 'You can edit only done game!';
    }

    if (!adminIds.includes(userId)) {
      return 'Only admin can do it!';
    }

    if (!game.isFree) {
      const gameBalances = this.getGameBalances(game);

      for (let i = 0; i < game.playUsers.length; i++) {
        await this.databaseService.setUserBalance(
          game.playUsers[i].id,
          Number(game.playUsers[i].balance) - gameBalances[i].gameBalance,
        );
      }
    }

    await this.databaseService.undoneGame(game.id);
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

  private async updateGameMessage({
    game,
    chatId,
    messageId,
    callbackQueryId,
    gameBalances,
  }: {
    game: Game;
    chatId: number;
    messageId: string;
    callbackQueryId: string;
    gameBalances: { userMarkdown: string; gameBalance: number }[];
  }): Promise<string | void> {
    const text = game.isDeleted
      ? this.messageService.getDeletedGameMessageText({
          gameId: game.id,
          createdByUserMarkdown: this.messageService.getUserMarkdown(game.createdBy),
        })
      : this.messageService.getGameMessageText({
          gameId: game.id,
          createdByUserMarkdown: this.messageService.getUserMarkdown(game.createdBy),
          playUsers: game.playUsers,
          payByUserMarkdown: game.payBy ? this.messageService.getUserMarkdown(game.payBy) : '',
          isFree: game.isFree,
          gameBalances,
        });

    const replyMarkup = game.isDeleted
      ? this.messageService.getDeletedGameReplyMarkup()
      : game.isDone
      ? this.messageService.getDoneGameReplyMarkup()
      : this.messageService.getReplyMarkup(game.isFree);

    try {
      await this.telegramService.editMessageText({
        text,
        chatId,
        messageId,
        replyMarkup: JSON.stringify(replyMarkup),
      });

      await this.telegramService.answerCallback({
        callbackQueryId,
        text: game.isDeleted ? 'Game was successfully deleted!' : 'Game was successfully updated!',
      });
    } catch (error) {
      console.error('Error sending telegram message: ', error.message);
      console.error('Error sending telegram message: ', error.response.data.description);
    }
  }
}
