import { IMain } from './IMain.interface';
import { IConfigurationService } from '../configuration/IConfigurationService.interface';
import { IDatabaseService } from '../database/IDatabaseService.interface';
import { ITelegramService } from '../telegram/ITelegramService.interface';
import { IMessageService } from '../message/IMessageService.interface';

import { IMessageBody } from '../common/model/IMessageBody.interface';
import { ICallbackMessageBody } from '../common/model/ICallbackMessageBody.interface';
import { Game } from '../database/entities/Expense.entity';

const NEW_EXPENSE_REGEXP = '[\\d].*[?]';
const PRICE_REGEXP = '\\[([\\d]+).*\\]';
const EXPENSE_REGEXP = '\\{(.*)\\}';

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

    if (this.isCallbackMessage(message)) {
      await this.processCallbackMessage(message as ICallbackMessageBody);
    } else {
      await this.processGroupMessage(message as IMessageBody);
    }
  }

  private isCallbackMessage(message: IMessageBody | ICallbackMessageBody): boolean {
    return 'callback_query' in message;
  }

  private async processGroupMessage(messageBody: IMessageBody): Promise<void> {
    const { defaultPrice } = this.configurationService.getConfiguration();

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

    const playRegExp = new RegExp(NEW_EXPENSE_REGEXP, 'gm');
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

    const priceRegExp = new RegExp(PRICE_REGEXP, 'gm');
    const priceMatchArray = priceRegExp.exec(messageText);
    const price = Number(priceMatchArray && priceMatchArray[1]) || defaultPrice;

    const expenseRegExp = new RegExp(EXPENSE_REGEXP, 'gm');
    const expenseMatchArray = expenseRegExp.exec(messageText);
    const expense = (expenseMatchArray && expenseMatchArray[1]) || '';

    const expenseId = await this.databaseService.createExpense(price, userId, chatId, expense);
    const userBalance = await this.databaseService.getUserBalance(userId, chatId);

    await this.createExpenseMessage({
      expenseId,
      userId,
      username,
      firstName,
      userBalance,
      chatId,
      price,
      expense,
    });
  }

  private async createExpenseMessage({
    expenseId,
    userId,
    username,
    firstName,
    userBalance,
    chatId,
    price,
    expense,
  }: {
    expenseId: number;
    userId: number;
    username?: string;
    firstName?: string;
    userBalance: number;
    chatId: number;
    price: number;
    expense: string;
  }): Promise<void> {
    const userMarkdown = this.messageService.getUserMarkdown({ username, firstName, id: userId });

    const text = this.messageService.getMessageText({
      expenseId,
      price,
      createdByUserMarkdown: userMarkdown,
      playUsers: [{ username, firstName, id: userId, balance: userBalance }],
      payByUserMarkdown: userMarkdown,
      expenseBalances: [{ userMarkdown, expenseBalance: 0 }],
      expense,
    });

    const replyMarkup = this.messageService.getReplyMarkup(false);

    try {
      const messageId = await this.telegramService.sendMessage({
        replyMarkup: JSON.stringify(replyMarkup),
        text,
        chatId,
      });

      await this.databaseService.addExpenseMessageId(expenseId, messageId);
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

    const expense = await this.databaseService.getExpense(chatId, messageId);
    console.log(`Current expense: ${JSON.stringify(expense)}`);

    switch (data) {
      case 'split/not split':
        await this.splitExpense(expense, userId);
        break;

      case 'split and pay/not pay':
        await this.splitAndPayExpense(expense, userId);

        await this.telegramService.sendMessage({
          text: expense.payBy
            ? 'Who will pay?'
            : `${this.messageService.getUserMarkdown({ username, firstName, id: userId })} will pay`,
          chatId,
          replyMarkup: '',
        });

        break;

      case 'free':
        await this.freeExpense(expense);

        if (expense.isFree) {
          await this.telegramService.sendMessage({
            text: 'Who will pay?',
            chatId,
            replyMarkup: '',
          });
        }

        break;

      case 'done': {
        const doneFailMessage = await this.doneExpense(expense, userId, chatId);
        if (doneFailMessage) {
          await this.telegramService.answerCallback({ callbackQueryId, text: doneFailMessage });
          return;
        }
        break;
      }

      case 'delete': {
        const deleteFailMessage = await this.deleteExpense(expense, userId, chatId);
        if (deleteFailMessage) {
          await this.telegramService.answerCallback({ callbackQueryId, text: deleteFailMessage });
          return;
        }
        break;
      }

      case 'restore': {
        const restoreFailMessage = await this.restoreExpense(expense, userId, chatId);
        if (restoreFailMessage) {
          await this.telegramService.answerCallback({ callbackQueryId, text: restoreFailMessage });
          return;
        }
        break;
      }

      case 'edit': {
        const editFailMessage = await this.editExpense(expense, userId, chatId);
        if (editFailMessage) {
          await this.telegramService.answerCallback({ callbackQueryId, text: editFailMessage });
          return;
        }
        break;
      }

      default:
        return;
    }

    const updatedExpense = await this.databaseService.getExpense(chatId, messageId);

    const expenseBalances = this.getExpenseBalances(updatedExpense);

    await this.updateExpenseMessage({
      expense: data === 'done' ? ({ ...updatedExpense, playUsers: expense.playUsers } as Game) : updatedExpense,
      chatId,
      messageId,
      callbackQueryId,
      expenseBalances,
    });
  }

  private async splitExpense(expense: Game, userId: number): Promise<void> {
    if (expense.isDeleted || expense.isDone) {
      throw new Error("You can't play deleted or done expense");
    }

    if (expense.playUsers.some(u => u.id === userId)) {
      await this.databaseService.removePlayUser(expense.id, userId);

      if (expense.payBy && expense.payBy.id === userId) {
        await this.databaseService.updatePayBy(expense.id, null);
      }

      return;
    }

    await this.databaseService.addPlayUser(expense.id, userId);
  }

  private async splitAndPayExpense(expense: Game, userId: number): Promise<void> {
    if (expense.isDeleted || expense.isDone || expense.isFree) {
      throw new Error("You can't pay for the deleted, done or free expense");
    }

    if (expense.payBy && expense.payBy.id === userId) {
      await this.databaseService.updatePayBy(expense.id, null);

      return;
    }

    await this.databaseService.updatePayBy(expense.id, userId);

    if (!expense.playUsers.some(u => u.id === userId)) {
      await this.databaseService.addPlayUser(expense.id, userId);
    }
  }

  private async freeExpense(expense: Game): Promise<void> {
    if (expense.isDeleted || expense.isDone) {
      throw new Error("You can't set deleted or done expense free");
    }

    if (expense.isFree) {
      await this.databaseService.notFreeExpense(expense.id);

      return;
    }

    await this.databaseService.freeExpense(expense.id);
    await this.databaseService.updatePayBy(expense.id, null);
  }

  private async doneExpense(expense: Game, userId: number, chatId: number): Promise<string | void> {
    if (expense.isDeleted || expense.isDone) {
      throw new Error("You can't finish deleted or done expense");
    }

    if (!expense.isFree && !expense.payBy) {
      return 'You can\'t finish a game if it is not free and nobody paid!';
    }

    if (expense.createdBy.id !== userId) {
      const adminIds = await this.telegramService.getChatAdministratorsIds(chatId);

      if (!adminIds.includes(userId)) {
        return 'You can finish only your own games!';
      }
    }

    if (!expense.isFree) {
      const expenseBalances = this.getExpenseBalances(expense);

      for (let i = 0; i < expense.playUsers.length; i++) {
        await this.databaseService.setUserBalance(
          expense.playUsers[i].id,
          chatId,
          Number(expense.playUsers[i].balances[0].amount) + expenseBalances[i].expenseBalance,
        );
      }
    }

    await this.databaseService.doneExpense(expense.id);
  }

  private async deleteExpense(expense: Game, userId: number, chatId: number): Promise<string | void> {
    if (expense.isDeleted || expense.isDone) {
      throw new Error("You can't delete deleted or done expense");
    }

    if (expense.createdBy.id !== userId) {
      const adminIds = await this.telegramService.getChatAdministratorsIds(chatId);

      if (!adminIds.includes(userId)) {
        return 'You can delete only your own games!';
      }
    }

    await this.databaseService.deleteExpense(expense.id);
  }

  private async restoreExpense(expense: Game, userId: number, chatId: number): Promise<string | void> {
    if (!expense.isDeleted || expense.isDone) {
      throw new Error("You can't restore not deleted or done expense");
    }

    const adminIds = await this.telegramService.getChatAdministratorsIds(chatId);

    if (!adminIds.includes(userId)) {
      return 'Only admin can restore a game!';
    }

    await this.databaseService.restoreExpense(expense.id);
  }

  private async editExpense(expense: Game, userId: number, chatId: number): Promise<string | void> {
    if (expense.isDeleted || !expense.isDone) {
      throw new Error("You can't edit deleted or not done expense");
    }

    if (!expense.isDone) {
      return 'You can edit only done game!';
    }

    const adminIds = await this.telegramService.getChatAdministratorsIds(chatId);

    if (!adminIds.includes(userId)) {
      return 'Only admin can edit a game';
    }

    if (!expense.isFree) {
      const expenseBalances = this.getExpenseBalances(expense);

      for (let i = 0; i < expense.playUsers.length; i++) {
        await this.databaseService.setUserBalance(
          expense.playUsers[i].id,
          chatId,
          Number(expense.playUsers[i].balances[0].amount) - expenseBalances[i].expenseBalance,
        );
      }
    }

    await this.databaseService.editExpense(expense.id);
  }

  private getExpenseBalances({
    isFree,
    playUsers,
    price,
    payBy,
  }: {
    isFree: boolean;
    playUsers: { username?: string; firstName?: string; id: number }[];
    price: number;
    payBy?: { id: number } | null;
  }): { id: number; userMarkdown: string; expenseBalance: number }[] {
    if (isFree || !payBy) {
      return [];
    }

    const expenseCost = price / playUsers.length;

    const expenseBalances = playUsers.map(u => {
      let userExpenseBalance = 0;

      if (payBy.id === u.id) {
        userExpenseBalance += price;
      }

      userExpenseBalance -= expenseCost;

      return {
        id: u.id,
        userMarkdown: this.messageService.getUserMarkdown(u),
        expenseBalance: userExpenseBalance,
      };
    });

    return expenseBalances;
  }

  private async updateExpenseMessage({
    expense,
    chatId,
    messageId,
    callbackQueryId,
    expenseBalances,
  }: {
    expense: Game;
    chatId: number;
    messageId: number;
    callbackQueryId: string;
    expenseBalances: { userMarkdown: string; expenseBalance: number }[];
  }): Promise<string | void> {
    const text = expense.isDeleted
      ? this.messageService.getDeletedExpenseMessageText({
          expenseId: expense.id,
          createdByUserMarkdown: this.messageService.getUserMarkdown(expense.createdBy),
          expense: expense.expense,
        })
      : this.messageService.getMessageText({
          expenseId: expense.id,
          createdByUserMarkdown: this.messageService.getUserMarkdown(expense.createdBy),
          playUsers: expense.playUsers.map(u => ({ ...u, balance: u.balances[0].amount })),
          payByUserMarkdown: expense.payBy ? this.messageService.getUserMarkdown(expense.payBy) : '',
          isFree: expense.isFree,
          price: expense.price,
          expenseBalances,
          expense: expense.expense,
        });

    const replyMarkup = expense.isDeleted
      ? this.messageService.getDeletedExpenseReplyMarkup()
      : expense.isDone
      ? this.messageService.getDoneExpenseReplyMarkup()
      : this.messageService.getReplyMarkup(expense.isFree);

    try {
      await this.telegramService.editMessageText({
        text,
        chatId,
        messageId,
        replyMarkup: JSON.stringify(replyMarkup),
      });

      await this.telegramService.answerCallback({
        callbackQueryId,
        text: expense.isDeleted ? 'The game was successfully deleted!' : 'The game was successfully updated!',
      });
    } catch (error) {
      console.error('Error sending telegram message: ', error.message);
      console.error('Error sending telegram message: ', error.response.data.description);
    }
  }
}
