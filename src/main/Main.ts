import Fraction from 'fraction.js';

import { IMain } from './IMain.interface';
import { IConfiguration } from './IConfiguration.interface';
import { IDatabaseService } from '../database/IDatabaseService.interface';
import { ITelegramService } from '../telegram/ITelegramService.interface';
import { IMessageService } from '../message/IMessageService.interface';

import { IMessageBody } from '../common/model/IMessageBody.interface';
import { ICallbackMessageBody } from '../common/model/ICallbackMessageBody.interface';
import { Expense } from '../database/entities/Expense.entity';

const NEW_EXPENSE_REGEXP = '[\\d].*[?]';
const PRICE_REGEXP = '\\[([\\d]+[.\\d]+).*\\]';
const EXPENSE_REGEXP = '\\{(.*)\\}';
const BALANCES_REGEXP = 'balances link';
const SET_DEFAULT_PRICE_REGEXP = 'set default price ([\\d]+[.\\d]+)';

const DEFAULT_EXPENSE_NAME = 'expense';
const DEFAULT_ACTION_NAME = 'split';

export class Main implements IMain {
  constructor(
    private readonly configuration: IConfiguration,
    private readonly databaseService: IDatabaseService,
    private readonly telegramService: ITelegramService,
    private readonly messageService: IMessageService,
  ) {
    this.configuration = configuration;
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

    const messageText = text.trim();

    const balancesRegExp = new RegExp(BALANCES_REGEXP, 'i');
    if (balancesRegExp.test(messageText)) {
      const text = chatUsername
        ? `${this.configuration.publicUrl}/?group=${chatUsername}` || 'No url set up!'
        : 'Make group public to get a link!';

      await this.telegramService.sendMessage({
        text,
        chatId,
        replyMarkup: '',
      });

      return;
    }

    const setDefaultPriceRegexp = new RegExp(SET_DEFAULT_PRICE_REGEXP, 'i');
    if (setDefaultPriceRegexp.test(messageText)) {
      const defaultPriceMatchArray = setDefaultPriceRegexp.exec(messageText);
      const defaultPrice = Number(defaultPriceMatchArray && defaultPriceMatchArray[1]);

      await this.databaseService.setDefaultPrice(chatId, defaultPrice);

      await this.telegramService.sendMessage({
        text: `Group default price is ${defaultPrice} now!`,
        chatId,
        replyMarkup: '',
      });

      return;
    }

    const playRegExp = new RegExp(NEW_EXPENSE_REGEXP, 'gmi');
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

    const { defaultPrice, defaultExpenseName, defaultActionName } = await this.databaseService.getGroupDefaults(chatId);

    const priceRegExp = new RegExp(PRICE_REGEXP, 'gmi');
    const priceMatchArray = priceRegExp.exec(messageText);
    const price = Number(priceMatchArray && priceMatchArray[1]) || defaultPrice;

    if (!price) {
      console.error('No price found!');
      return;
    }

    const expenseRegExp = new RegExp(EXPENSE_REGEXP, 'gm');
    const expenseMatchArray = expenseRegExp.exec(messageText);
    const expenseName =
      (expenseMatchArray && expenseMatchArray[1]) ||
      defaultExpenseName ||
      this.configuration.defaultExpenseName ||
      DEFAULT_EXPENSE_NAME;

    const actionName = defaultActionName || this.configuration.defaultActionName || DEFAULT_ACTION_NAME;

    const expenseId = await this.databaseService.createExpense(price, userId, chatId, expenseName);
    const userBalance = await this.databaseService.getUserBalance(userId, chatId);

    await this.createExpenseMessage({
      expenseId,
      userId,
      username,
      firstName,
      userBalance,
      chatId,
      price,
      expenseName,
      actionName,
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
    expenseName,
    actionName,
  }: {
    expenseId: number;
    userId: number;
    username?: string;
    firstName?: string;
    userBalance: string;
    chatId: number;
    price: number;
    expenseName: string;
    actionName: string;
  }): Promise<void> {
    const userMarkdown = this.messageService.getUserMarkdown({ username, firstName, id: userId });

    const text = this.messageService.getMessageText({
      expenseId,
      price,
      createdByUserMarkdown: userMarkdown,
      splitUsers: [{ username, firstName, id: userId, balance: userBalance }],
      payByUserMarkdown: userMarkdown,
      expenseBalances: [{ userMarkdown, expenseBalance: '0' }],
      expenseName,
      actionName,
    });

    const replyMarkup = this.messageService.getReplyMarkup({ actionName, isFree: false });

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

    const { defaultExpenseName, defaultActionName } = await this.databaseService.getGroupDefaults(chatId);

    const expense = await this.databaseService.getExpense(chatId, messageId);
    console.log(`Current expense: ${JSON.stringify(expense)}`);

    switch (data) {
      case 'split | not split and not pay':
        await this.splitExpense(expense, userId);

        if (!expense.isFree && expense.payBy && expense.payBy.id === userId) {
          await this.telegramService.sendMessage({
            text: 'Who will pay?',
            chatId,
            replyMarkup: '',
          });
        }

        break;

      case 'split and pay | not pay':
        await this.splitAndPayExpense(expense, userId);

        await this.telegramService.sendMessage({
          text:
            expense.payBy && expense.payBy.id === userId
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
        } else if (expense.payBy && expense.payBy.id !== userId) {
          await this.telegramService.sendMessage({
            text: `${defaultExpenseName || this.configuration.defaultExpenseName || DEFAULT_EXPENSE_NAME} is free!`,
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
      expense: data === 'done' ? ({ ...updatedExpense, playUsers: expense.playUsers } as Expense) : updatedExpense,
      chatId,
      messageId,
      callbackQueryId,
      expenseBalances,
      defaultExpenseName: defaultExpenseName || this.configuration.defaultExpenseName || DEFAULT_EXPENSE_NAME,
      defaultActionName: defaultActionName || this.configuration.defaultActionName || DEFAULT_ACTION_NAME,
    });
  }

  private async splitExpense(expense: Expense, userId: number): Promise<void> {
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

  private async splitAndPayExpense(expense: Expense, userId: number): Promise<void> {
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

  private async freeExpense(expense: Expense): Promise<void> {
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

  private async doneExpense(expense: Expense, userId: number, chatId: number): Promise<string | void> {
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
          new Fraction(expense.playUsers[i].balances[0].amountPrecise as string)
            .add(expenseBalances[i].expenseBalance)
            .toString(),
        );
      }
    }

    await this.databaseService.doneExpense(expense.id);
  }

  private async deleteExpense(expense: Expense, userId: number, chatId: number): Promise<string | void> {
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

  private async restoreExpense(expense: Expense, userId: number, chatId: number): Promise<string | void> {
    if (!expense.isDeleted || expense.isDone) {
      throw new Error("You can't restore not deleted or done expense");
    }

    const adminIds = await this.telegramService.getChatAdministratorsIds(chatId);

    if (!adminIds.includes(userId)) {
      return 'Only admin can restore a game!';
    }

    await this.databaseService.restoreExpense(expense.id);
  }

  private async editExpense(expense: Expense, userId: number, chatId: number): Promise<string | void> {
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
          new Fraction(expense.playUsers[i].balances[0].amountPrecise as string)
            .sub(expenseBalances[i].expenseBalance)
            .toString(),
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
  }): { id: number; userMarkdown: string; expenseBalance: string }[] {
    if (isFree || !payBy) {
      return [];
    }

    const expenseCost = new Fraction(price).div(playUsers.length);

    const expenseBalances = playUsers.map(u => {
      let userExpenseBalance = new Fraction(0);

      if (payBy.id === u.id) {
        userExpenseBalance = new Fraction(price);
      }

      userExpenseBalance = userExpenseBalance.sub(expenseCost);

      return {
        id: u.id,
        userMarkdown: this.messageService.getUserMarkdown(u),
        expenseBalance: userExpenseBalance.toString(),
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
    defaultExpenseName,
    defaultActionName,
  }: {
    expense: Expense;
    chatId: number;
    messageId: number;
    callbackQueryId: string;
    expenseBalances: { userMarkdown: string; expenseBalance: string }[];
    defaultExpenseName: string;
    defaultActionName: string;
  }): Promise<string | void> {
    const text = expense.isDeleted
      ? this.messageService.getDeletedExpenseMessageText({
          expenseId: expense.id,
          createdByUserMarkdown: this.messageService.getUserMarkdown(expense.createdBy),
          expenseName: expense.expense || defaultExpenseName,
        })
      : this.messageService.getMessageText({
          expenseId: expense.id,
          createdByUserMarkdown: this.messageService.getUserMarkdown(expense.createdBy),
          splitUsers: expense.playUsers.map(u => ({ ...u, balance: u.balances[0].amountPrecise as string })),
          payByUserMarkdown: expense.payBy ? this.messageService.getUserMarkdown(expense.payBy) : '',
          isFree: expense.isFree,
          price: expense.price,
          expenseBalances,
          expenseName: expense.expense || defaultExpenseName,
          actionName: defaultActionName,
        });

    const replyMarkup = expense.isDeleted
      ? this.messageService.getDeletedExpenseReplyMarkup()
      : expense.isDone
      ? this.messageService.getDoneExpenseReplyMarkup()
      : this.messageService.getReplyMarkup({ actionName: defaultActionName, isFree: expense.isFree });

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
