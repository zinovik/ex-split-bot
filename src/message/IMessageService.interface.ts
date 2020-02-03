import { IReplyMarkup } from '../common/model/IReplyMarkup.interface';

export interface IMessageService {
  getUserMarkdown({ username, firstName, id }: { username?: string; firstName?: string; id: number }): string;

  getMessageText(parameters: {
    expenseId: number;
    createdByUserMarkdown: string;
    playUsers: { username?: string; firstName?: string; id: number; balance: string }[];
    payByUserMarkdown: string;
    isFree?: boolean;
    price?: number;
    expenseBalances: { userMarkdown: string; expenseBalance: string }[];
    expense?: string;
  }): string;

  getDeletedExpenseMessageText(parameters: {
    expenseId: number;
    createdByUserMarkdown: string;
    expense?: string;
  }): string;

  getReplyMarkup(isFree?: boolean): IReplyMarkup;
  getDoneExpenseReplyMarkup(): IReplyMarkup;
  getDeletedExpenseReplyMarkup(): IReplyMarkup;
}
