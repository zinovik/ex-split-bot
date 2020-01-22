import { IMessageService } from './IMessageService.interface';
import { IReplyMarkup } from '../common/model/IReplyMarkup.interface';

const DEFAULT_EXPENSE_NAME = 'game';
const DEFAULT_SPLIT_NAME = 'play';

export class MessageService implements IMessageService {
  getUserMarkdown({ username, firstName, id }: { username?: string; firstName?: string; id: number }): string {
    return `[${firstName || username || String(id)}](tg://user?id=${String(id)})`;
  }

  getMessageText({
    expenseId,
    createdByUserMarkdown,
    playUsers,
    payByUserMarkdown,
    isFree = false,
    price = 0,
    expenseBalances,
    expense,
  }: {
    expenseId: number;
    createdByUserMarkdown: string;
    playUsers: { username?: string; firstName?: string; id: number; balance: number }[];
    payByUserMarkdown: string;
    isFree?: boolean;
    price?: number;
    expenseBalances: { userMarkdown: string; expenseBalance: number }[];
    expense?: string;
  }): string {
    return (
      `${this.getExpenseNumberText(expenseId, expense)}\n` +
      `\n` +
      `${this.getExpenseCreated(createdByUserMarkdown, isFree, price, expense)}\n` +
      `\n` +
      (isFree ? '' : `${this.getBalancesBeforeExpense(playUsers, expense)}\n` + `\n`) +
      `${this.getPlayUsers(playUsers)}` +
      (isFree ? '' : `\n` + `${this.getPayUser(payByUserMarkdown)}\n` + `\n` + this.getExpenseBalances(expenseBalances))
    );
  }

  private getExpenseNumberText(expenseId: number, expense?: string): string {
    return `${expense || DEFAULT_EXPENSE_NAME} #${expenseId}`;
  }

  private getExpenseCreated(createdByUserMarkdown: string, isFree: boolean, price: number, expense?: string): string {
    return `${createdByUserMarkdown} invites to ${expense ? 'split expenses' : DEFAULT_SPLIT_NAME}${
      isFree ? ' for FREE' : ''
    }!${isFree ? '' : `\n${expense || DEFAULT_EXPENSE_NAME} price: ${price} BYN`}`;
  }

  private getBalancesBeforeExpense(
    playUsers: { username?: string; firstName?: string; id: number; balance: number }[],
    expense?: string,
  ): string {
    return (
      `Balances before the ${expense || DEFAULT_EXPENSE_NAME}:` +
      `${playUsers.map(u => `\n${this.getUserMarkdown(u)}: ${u.balance} BYN`)}`
    );
  }

  private getPlayUsers(playUsers: { username?: string; firstName?: string; id: number }[]): string {
    return `play: ${playUsers.map(u => `${this.getUserMarkdown(u)}`).join(', ')}`;
  }

  private getPayUser(payByUserMarkdown: string): string {
    return `pay: ${payByUserMarkdown}`;
  }

  private getExpenseBalances(expenseBalances: { userMarkdown: string; expenseBalance: number }[]): string {
    return `Game balances:` + `${expenseBalances.map(u => `\n${u.userMarkdown}: ${u.expenseBalance} BYN`)}`;
  }

  getDeletedExpenseMessageText({
    expenseId,
    createdByUserMarkdown,
    expense,
  }: {
    expenseId: number;
    createdByUserMarkdown: string;
    expense?: string;
  }): string {
    return (
      `${this.getExpenseNumberText(expenseId, expense)}\n` + `Game created by ${createdByUserMarkdown} was deleted :(`
    );
  }

  getReplyMarkup(isFree = false): IReplyMarkup {
    return {
      inline_keyboard: [
        [{ text: `${DEFAULT_SPLIT_NAME}/not ${DEFAULT_SPLIT_NAME}`, callback_data: 'split/not split' }],
        [
          ...(isFree
            ? []
            : [{ text: `${DEFAULT_SPLIT_NAME} and pay/not pay`, callback_data: 'split and pay/not pay' }]),
        ],
        [
          { text: 'free', callback_data: 'free' },
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
