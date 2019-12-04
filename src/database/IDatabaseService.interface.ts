import { Game } from './entities/Game.entity';

export interface IDatabaseService {
  getUserBalance(userId: number): Promise<number>;

  setUserBalance(parameters: { userId: number; balance: number; username: string; firstName: string; lastName: string }): Promise<void>;

  createGame(parameters: { userId: number; price: number; username: string; firstName: string; lastName: string }): Promise<Game>;
}
