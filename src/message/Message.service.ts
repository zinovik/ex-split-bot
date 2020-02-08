import { IMessageService } from './IMessageService.interface';
import { IReplyMarkup } from '../common/model/IReplyMarkup.interface';

export class MessageService implements IMessageService {
  getUserMarkdown({ username, firstName, id }: { username?: string; firstName?: string; id: number }): string {
    return `[${firstName || username || String(id)}](tg://user?id=${String(id)})`;
  }

  getMessageText({
    expenseId,
    createdByUserMarkdown,
    splitUsers,
    payByUserMarkdown,
    isFree = false,
    price = 0,
    expenseBalances,
    expenseName,
    actionName,
  }: {
    expenseId: number;
    createdByUserMarkdown: string;
    splitUsers: { username?: string; firstName?: string; id: number; balance: string }[];
    payByUserMarkdown: string;
    isFree?: boolean;
    price?: number;
    expenseBalances: { userMarkdown: string; expenseBalance: string }[];
    expenseName: string;
    actionName: string;
  }): string {
    return (
      `${this.getExpenseNumberText(expenseId)}\n` +
      `${this.getExpenseCreated(createdByUserMarkdown, isFree, price, expenseName, actionName)}\n` +
      `\n` +
      (isFree ? '' : `${this.getBalancesBeforeExpense(splitUsers, expenseName)}\n` + `\n`) +
      `${this.getSplitUsers(splitUsers, actionName)}` +
      (isFree
        ? ''
        : `\n` +
          `${this.getPayUser(payByUserMarkdown)}\n` +
          `\n` +
          this.getExpenseBalances(expenseName, expenseBalances))
    );
  }

  private getExpenseNumberText(expenseId: number): string {
    return `#${expenseId}`;
  }

  private getExpenseCreated(
    createdByUserMarkdown: string,
    isFree: boolean,
    price: number,
    expenseName: string,
    actionName: string,
  ): string {
    return `${createdByUserMarkdown} invites to ${actionName} the ${expenseName}${isFree ? ' for FREE' : ''}!${
      isFree ? '' : `\n${this.firstLetterUppercase(expenseName)} price: ${price} BYN`
    }`;
  }

  private getBalancesBeforeExpense(
    splitUsers: { username?: string; firstName?: string; id: number; balance: string }[],
    expenseName: string,
  ): string {
    return (
      `Balances before the ${expenseName}:` + `${splitUsers.map(u => `\n${this.getUserMarkdown(u)}: ${u.balance} BYN`)}`
    );
  }

  private getSplitUsers(
    splitUsers: { username?: string; firstName?: string; id: number }[],
    actionName: string,
  ): string {
    return `${actionName}: ${splitUsers.map(u => `${this.getUserMarkdown(u)}`).join(', ')}`;
  }

  private getPayUser(payByUserMarkdown: string): string {
    return `pay: ${payByUserMarkdown}`;
  }

  private getExpenseBalances(
    expenseName: string,
    expenseBalances: { userMarkdown: string; expenseBalance: string }[],
  ): string {
    return (
      `${this.firstLetterUppercase(expenseName)} balances:` +
      `${expenseBalances.map(u => `\n${u.userMarkdown}: ${u.expenseBalance} BYN`)}`
    );
  }

  private firstLetterUppercase(lower: string): string {
    return lower.charAt(0).toUpperCase() + lower.substring(1);
  }

  getDeletedExpenseMessageText({
    expenseId,
    createdByUserMarkdown,
    expenseName,
  }: {
    expenseId: number;
    createdByUserMarkdown: string;
    expenseName: string;
  }): string {
    return (
      `${this.getExpenseNumberText(expenseId)}\n` + `${expenseName} created by ${createdByUserMarkdown} was deleted :(`
    );
  }

  getReplyMarkup({ actionName, isFree = false }: { actionName: string; isFree?: boolean }): IReplyMarkup {
    return {
      inline_keyboard: [
        [
          {
            text: `${actionName} | not ${actionName}${isFree ? '' : ' and not pay'}`,
            callback_data: 'split | not split and not pay',
          },
        ],
        [...(isFree ? [] : [{ text: `${actionName} and pay | not pay`, callback_data: 'split and pay | not pay' }])],
        [
          { text: isFree ? 'not free' : 'free', callback_data: 'free' },
          { text: 'done', callback_data: 'done' },
          { text: 'delete', callback_data: 'delete' },
        ],
      ],
    };
  }

  getDoneExpenseReplyMarkup(): IReplyMarkup {
    return {
      inline_keyboard: [[{ text: 'edit', callback_data: 'edit' }]],
    };
  }

  getDeletedExpenseReplyMarkup(): IReplyMarkup {
    return {
      inline_keyboard: [[{ text: 'restore', callback_data: 'restore' }]],
    };
  }
}
