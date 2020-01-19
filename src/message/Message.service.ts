import { IMessageService } from './IMessageService.interface';
import { IReplyMarkup } from '../common/model/IReplyMarkup.interface';

const DEFAULT_EXPENSE_NAME = 'game';
const DEFAULT_SPLIT_NAME = 'play';

export class MessageService implements IMessageService {
  getUserMarkdown({ username, firstName, id }: { username?: string; firstName?: string; id: number }): string {
    return `[${firstName || username || String(id)}](tg://user?id=${String(id)})`;
  }

  getMessageText({
    gameId,
    createdByUserMarkdown,
    playUsers,
    payByUserMarkdown,
    isFree = false,
    gamePrice = 0,
    gameBalances,
    expense,
  }: {
    gameId: number;
    createdByUserMarkdown: string;
    playUsers: { username?: string; firstName?: string; id: number; balance: number }[];
    payByUserMarkdown: string;
    isFree?: boolean;
    gamePrice?: number;
    gameBalances: { userMarkdown: string; gameBalance: number }[];
    expense?: string;
  }): string {
    return (
      `${this.getExpenseNumberText(gameId, expense)}\n` +
      `\n` +
      `${this.getExpenseCreated(createdByUserMarkdown, isFree, gamePrice, expense)}\n` +
      `\n` +
      (isFree ? '' : `${this.getBalancesBeforeExpense(playUsers, expense)}\n` + `\n`) +
      `${this.getPlayUsers(playUsers)}` +
      (isFree ? '' : `\n` + `${this.getPayUser(payByUserMarkdown)}\n` + `\n` + this.getGameBalances(gameBalances))
    );
  }

  private getExpenseNumberText(gameId: number, expense?: string): string {
    return `${expense || DEFAULT_EXPENSE_NAME} #${gameId}`;
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

  private getGameBalances(gameBalances: { userMarkdown: string; gameBalance: number }[]): string {
    return `Game balances:` + `${gameBalances.map(u => `\n${u.userMarkdown}: ${u.gameBalance} BYN`)}`;
  }

  getDeletedExpenseMessageText({
    gameId,
    createdByUserMarkdown,
    expense,
  }: {
    gameId: number;
    createdByUserMarkdown: string;
    expense?: string;
  }): string {
    return (
      `${this.getExpenseNumberText(gameId, expense)}\n` + `Game created by ${createdByUserMarkdown} was deleted :(`
    );
  }

  getReplyMarkup(isFree = false): IReplyMarkup {
    return {
      inline_keyboard: [
        [
          { text: DEFAULT_SPLIT_NAME, callback_data: 'play' },
          ...(isFree ? [] : [{ text: 'pay', callback_data: 'pay' }]),
          { text: 'free', callback_data: 'free' },
          { text: 'done', callback_data: 'done' },
          { text: 'delete', callback_data: 'delete' },
        ],
      ],
    };
  }

  getDoneGameReplyMarkup(): IReplyMarkup {
    return {
      inline_keyboard: [[{ text: 'edit', callback_data: 'edit' }]],
    };
  }

  getDeletedGameReplyMarkup(): IReplyMarkup {
    return {
      inline_keyboard: [[{ text: 'restore', callback_data: 'restore' }]],
    };
  }
}
