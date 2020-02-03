import { Expense } from './entities/Expense.entity';
import { User } from './entities/User.entity';

export interface IDatabaseService {
  upsertUser(parameters: {
    userId: number;
    chatId: number;
    userUsername?: string;
    chatUsername?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ defaultPrice?: number }>;

  getUserBalance(userId: number, chatId: number): Promise<string>;
  setUserBalance(userId: number, chatId: number, balance: string): Promise<void>;

  createExpense(price: number, userId: number, chatId: number, expense: string): Promise<number>;
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

  getUsers(chatUsername: string): Promise<User[]>;
  getGroupsNames(): Promise<string[]>;

  closeConnection(): Promise<void>;
}
