import { IReplyMarkup } from '../common/model/IReplyMarkup.interface';
import { User } from './../database/entities/User.entity';

export interface IMessageService {
  getGameInvitation(parameters: {
    gameId: number;
    createdByUsername: string;
    playUsers: User[];
    payByUsername: string;
    isFree: boolean;
    gameBalances: { username: string; gameBalance: number }[];
  }): Promise<string>;

  parseGameId(text: string): Promise<number>;

  getReplyMarkup(): Promise<IReplyMarkup>;
}
