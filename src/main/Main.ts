import { IMain } from './IMain.interface';
import { IConfigurationService } from '../configuration/IConfigurationService.interface';
import { IDatabaseService } from '../database/IDatabaseService.interface';
import { ITelegramService } from '../telegram/ITelegramService.interface';
import { IMessageService } from '../message/IMessageService.interface';

import { IMessageBody } from '../common/model/IMessageBody.interface';
import { ICallbackMessageBody } from '../common/model/ICallbackMessageBody.interface';
import { Game } from '../database/entities/Game.entity';

const NEW_GAME_REGEXP = '[0-9].*[?]';

export class Main implements IMain {
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

    try {
      if (this.isCallbackMessage(message)) {
        await this.processCallbackMessage(message as ICallbackMessageBody);
      } else {
        await this.processGroupMessage(message as IMessageBody);
      }
    } catch (error) {
      await this.databaseService.closeConnection();

      throw new Error(error);
    }

    await this.databaseService.closeConnection();
  }

  private isCallbackMessage(message: IMessageBody | ICallbackMessageBody): boolean {
    return 'callback_query' in message;
  }

  private async processGroupMessage(messageBody: IMessageBody): Promise<void> {
    const { gameCost } = this.configurationService.getConfiguration();

    const {
      message: {
        text,
        chat: { id: chatId, username: chatUsername },
        from: { first_name: firstName, last_name: lastName, username, id: userId },
      },
    } = messageBody;

    if (!text) {
      console.error('No message text!');
      return;
    }

    const messageText = text.trim().toLowerCase();

    const playRegExp = new RegExp(NEW_GAME_REGEXP, 'gm');
    if (!playRegExp.test(messageText)) {
      console.error('No keyword found!');
      return;
    }

    await this.databaseService.upsertUser({
      userId,
      chatId,
      userUsername: username,
      chatUsername,
      firstName,
      lastName,
    });

    const gameId = await this.databaseService.createGame(gameCost, userId, chatId);
    const userBalance = await this.databaseService.getUserBalance(userId, chatId);

    await this.createGameMessage({
      gameId,
      userId,
      username,
      firstName,
      userBalance,
      chatId,
      gameCost,
    });
  }

  private async createGameMessage({
    gameId,
    userId,
    username,
    firstName,
    userBalance,
    chatId,
    gameCost,
  }: {
    gameId: number;
    userId: number;
    username?: string;
    firstName?: string;
    userBalance: number;
    chatId: number;
    gameCost: number;
  }): Promise<void> {
    const userMarkdown = this.messageService.getUserMarkdown({ username, firstName, id: userId });

    const text = this.messageService.getGameMessageText({
      gameId,
      gameCost,
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
        chatId,
      });
    } catch (error) {
      console.error('Error sending telegram message: ', error.message);
      console.error('Error sending telegram message: ', error.response.data.description);
    }
  }

  private async processCallbackMessage(messageParsed: ICallbackMessageBody): Promise<void> {
    const {
      callback_query: {
        id: callbackQueryId,
        data,
        message: {
          text,
          message_id: messageId,
          chat: { id: chatId, username: chatUsername },
        },
        from: { username, id: userId, first_name: firstName, last_name: lastName },
      },
    } = messageParsed;

    await this.databaseService.upsertUser({
      userId,
      chatId,
      userUsername: username,
      chatUsername,
      firstName,
      lastName,
    });

    const gameId = this.messageService.parseGameId(text);
    const game = await this.databaseService.getGame(gameId, chatId);

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
        const doneFailMessage = await this.doneGame(game, userId, chatId);
        if (doneFailMessage) {
          await this.telegramService.answerCallback({ callbackQueryId, text: doneFailMessage });
          return;
        }
        break;
      }

      case 'delete': {
        const deleteFailMessage = await this.deleteGame(game, userId, chatId);
        if (deleteFailMessage) {
          await this.telegramService.answerCallback({ callbackQueryId, text: deleteFailMessage });
          return;
        }
        break;
      }

      case 'restore': {
        const restoreFailMessage = await this.restoreGame(game, userId, chatId);
        if (restoreFailMessage) {
          await this.telegramService.answerCallback({ callbackQueryId, text: restoreFailMessage });
          return;
        }
        break;
      }

      case 'edit': {
        const editFailMessage = await this.editGame(game, userId, chatId);
        if (editFailMessage) {
          await this.telegramService.answerCallback({ callbackQueryId, text: editFailMessage });
          return;
        }
        break;
      }

      default:
        return;
    }

    const updatedGame = await this.databaseService.getGame(gameId, chatId);

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
      throw new Error("You can't play deleted or done game");
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
      throw new Error("You can't pay for the deleted, done or free game");
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
      throw new Error("You can't set deleted or done game free");
    }

    if (game.isFree) {
      await this.databaseService.notFreeGame(game.id);

      return;
    }

    await this.databaseService.freeGame(game.id);
    await this.databaseService.updatePayBy(game.id, null);
  }

  private async doneGame(game: Game, userId: number, chatId: number): Promise<string | void> {
    if (game.isDeleted || game.isDone) {
      throw new Error("You can't finish deleted or done game");
    }

    if (!game.isFree && !game.payBy) {
      return 'You can\'t finish a game if it is not free and nobody paid!';
    }

    if (game.createdBy.id !== userId) {
      const adminIds = await this.telegramService.getChatAdministratorsIds(chatId);

      if (!adminIds.includes(userId)) {
        return 'You can finish only your own games!';
      }
    }

    if (!game.isFree) {
      const gameBalances = this.getGameBalances(game);

      for (let i = 0; i < game.playUsers.length; i++) {
        await this.databaseService.setUserBalance(
          game.playUsers[i].id,
          chatId,
          Number(game.playUsers[i].balances[0].amount) + gameBalances[i].gameBalance,
        );
      }
    }

    await this.databaseService.doneGame(game.id);
  }

  private async deleteGame(game: Game, userId: number, chatId: number): Promise<string | void> {
    if (game.isDeleted || game.isDone) {
      throw new Error("You can't delete deleted or done game");
    }

    if (game.createdBy.id !== userId) {
      const adminIds = await this.telegramService.getChatAdministratorsIds(chatId);

      if (!adminIds.includes(userId)) {
        return 'You can delete only your own games!';
      }
    }

    await this.databaseService.deleteGame(game.id);
  }

  private async restoreGame(game: Game, userId: number, chatId: number): Promise<string | void> {
    if (!game.isDeleted || game.isDone) {
      throw new Error("You can't restore not deleted or done game");
    }

    const adminIds = await this.telegramService.getChatAdministratorsIds(chatId);

    if (!adminIds.includes(userId)) {
      return 'Only admin can restore a game!';
    }

    await this.databaseService.restoreGame(game.id);
  }

  private async editGame(game: Game, userId: number, chatId: number): Promise<string | void> {
    if (game.isDeleted || !game.isDone) {
      throw new Error("You can't edit deleted or not done game");
    }

    if (!game.isDone) {
      return 'You can edit only done game!';
    }

    const adminIds = await this.telegramService.getChatAdministratorsIds(chatId);

    if (!adminIds.includes(userId)) {
      return 'Only admin can edit a game';
    }

    if (!game.isFree) {
      const gameBalances = this.getGameBalances(game);

      for (let i = 0; i < game.playUsers.length; i++) {
        await this.databaseService.setUserBalance(
          game.playUsers[i].id,
          chatId,
          Number(game.playUsers[i].balances[0].amount) - gameBalances[i].gameBalance,
        );
      }
    }

    await this.databaseService.editGame(game.id);
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
    if (isFree || !payBy) {
      return [];
    }

    const gameCost = price / playUsers.length;

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
          playUsers: game.playUsers.map(u => ({ ...u, balance: u.balances[0].amount })),
          payByUserMarkdown: game.payBy ? this.messageService.getUserMarkdown(game.payBy) : '',
          isFree: game.isFree,
          gameCost: game.price,
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
        text: game.isDeleted ? 'The game was successfully deleted!' : 'The game was successfully updated!',
      });
    } catch (error) {
      console.error('Error sending telegram message: ', error.message);
      console.error('Error sending telegram message: ', error.response.data.description);
    }
  }
}
