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

  createGame(price: number, userId: number, chatId: number): Promise<number>;

  getGame(gameId: number, chatId: number): Promise<Game>;

  addPlayUser(gameId: number, userId: number): Promise<void>;
  removePlayUser(gameId: number, userId: number): Promise<void>;

  updatePayBy(gameId: number, userId: number | null): Promise<void>;

  freeGame(gameId: number): Promise<void>;
  notFreeGame(gameId: number): Promise<void>;

  doneGame(gameId: number): Promise<void>;
  editGame(gameId: number): Promise<void>;

  deleteGame(gameId: number): Promise<void>;
  restoreGame(gameId: number): Promise<void>;

  getUsers(chatUsername: string): Promise<User[]>;

  closeConnection(): Promise<void>;
}
