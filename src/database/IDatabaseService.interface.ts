import { Game } from './entities/Game.entity';
import { User } from './entities/User.entity';

export interface IDatabaseService {
  upsertUser(parameters: {
    userId: number;
    chatId: number;
    userUsername?: string;
    chatUsername?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void>;

  getUserBalance(userId: number, chatId: number): Promise<number>;
  setUserBalance(userId: number, chatId: number, balance: number): Promise<void>;

  createExpense(price: number, userId: number, chatId: number, expense: string): Promise<number>;
  addExpenseMessageId(expenseId: number, messageId: number): Promise<void>;

  getExpense(chatId: number, messageId: number): Promise<Game>;

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

  closeConnection(): Promise<void>;
}
