import { Game } from './entities/Game.entity';
import { User } from './entities/User.entity';

export interface IDatabaseService {
  upsertUser(user: { id: number; username?: string; firstName?: string; lastName?: string }): Promise<void>;

  getUserBalance(userId: number): Promise<number>;
  setUserBalance(userId: number, balance: number): Promise<void>;

  createGame(price: number, userId: number): Promise<number>;

  getGame(gameId: number): Promise<Game>;

  addPlayUser(gameId: number, userId: number): Promise<void>;
  removePlayUser(gameId: number, userId: number): Promise<void>;

  updatePayBy(gameId: number, userId: number | null): Promise<void>;

  freeGame(gameId: number): Promise<void>;
  notFreeGame(gameId: number): Promise<void>;

  doneGame(gameId: number): Promise<void>;
  editGame(gameId: number): Promise<void>;

  deleteGame(gameId: number): Promise<void>;
  restoreGame(gameId: number): Promise<void>;

  getUsers(): Promise<User[]>;

  closeConnection(): Promise<void>;
}
