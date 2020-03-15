import { Expense } from './entities/Expense.entity';

export interface IDatabaseService {
  upsertUser(parameters: {
    userId: number;
    chatId: number;
    userUsername?: string;
    chatUsername?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void>;

  getGroupDefaults(
    chatId: number,
  ): Promise<{ defaultPrice?: number | null; defaultExpenseName?: string | null; defaultActionName?: string | null }>;

  getUserBalance(userId: number, chatId: number): Promise<string>;
  setUserBalance(userId: number, chatId: number, balance: string): Promise<void>;

  createExpense(
    price: number,
    userId: number,
    chatId: number,
    expenseName?: string,
    actionName?: string,
  ): Promise<number>;
  addExpenseMessageId(expenseId: number, messageId: number): Promise<void>;

  getExpense(chatId: number, messageId: number): Promise<Expense>;

  addPlayUser(expenseId: number, userId: number): Promise<void>;
  removePlayUser(expenseId: number, userId: number): Promise<void>;

  updatePayBy(expenseId: number, userId: number | null): Promise<void>;

  freeExpense(expenseId: number): Promise<void>;
  notFreeExpense(expenseId: number): Promise<void>;

  doneExpense(expenseId: number): Promise<void>;
  editExpense(expenseId: number): Promise<void>;

  deleteExpense(expenseId: number): Promise<void>;
  restoreExpense(expenseId: number): Promise<void>;

  setDefaultPrice(chatId: number, defaultPrice: number): Promise<void>;
  setDefaultExpenseName(chatId: number, defaultExpenseName: string | null): Promise<void>;
  setDefaultActionName(chatId: number, defaultActionName: string | null): Promise<void>;

  removeDefaultPrice(chatId: number): Promise<void>;
  removeDefaultExpenseName(chatId: number): Promise<void>;
  removeDefaultActionName(chatId: number): Promise<void>;

  getUsers(group: string): Promise<{ firstName?: string; username?: string; lastName?: string; balance: string }[]>;
  getExpenses(username: string): Promise<Expense[]>;
  getGroupsNames(): Promise<string[]>;

  closeConnection(): Promise<void>;
}
