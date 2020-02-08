import { IReplyMarkup } from '../common/model/IReplyMarkup.interface';

export interface IMessageService {
  getUserMarkdown({ username, firstName, id }: { username?: string; firstName?: string; id: number }): string;

  getMessageText(parameters: {
    expenseId: number;
    createdByUserMarkdown: string;
    splitUsers: { username?: string; firstName?: string; id: number; balance: string }[];
    payByUserMarkdown: string;
    isFree?: boolean;
    price?: number;
    expenseBalances: { userMarkdown: string; expenseBalance: string }[];
    expenseName: string;
    actionName: string;
  }): string;

  getDeletedExpenseMessageText(parameters: {
    expenseId: number;
    createdByUserMarkdown: string;
    expenseName: string;
  }): string;

  getReplyMarkup(parameters: { actionName: string; isFree?: boolean }): IReplyMarkup;
  getDoneExpenseReplyMarkup(): IReplyMarkup;
  getDeletedExpenseReplyMarkup(): IReplyMarkup;
}
