import { User } from './entities/User.entity';
import { Game } from './entities/Game.entity';

export interface IDatabaseService {
  upsertUser(user: User): Promise<void>;

  getUserBalance(userId: number): Promise<number>;
  setUserBalance(userId: number, balance: number): Promise<void>;

  createGame(price: number, user: User): Promise<Game>;

  getGame(gameId: number): Promise<Game>;

  addPlayUser(gameId: number, userId: number): Promise<void>;
  removePlayUser(gameId: number, userId: number): Promise<void>;

  updatePayBy(gameId: number, userId: number | null): Promise<void>;

  freeGame(gameId: number): Promise<void>;
  notFreeGame(gameId: number): Promise<void>;

  doneGame(gameId: number): Promise<void>;
  removeGame(gameId: number): Promise<void>;

  closeConnection(): Promise<void>;
}
