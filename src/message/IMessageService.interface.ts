import { IReplyMarkup } from '../common/model/IReplyMarkup.interface';
import { User } from './../database/entities/User.entity';

export interface IMessageService {
  getUserMarkdown({ username, firstName, id }: { username?: string; firstName?: string; id: number }): string;

  getGameInvitation(parameters: {
    gameId: number;
    createdByUserMarkdown: string;
    playUsers: User[];
    payByUserMarkdown: string;
    isFree: boolean;
    gameBalances: { userMarkdown: string; gameBalance: number }[];
  }): Promise<string>;

  parseGameId(text: string): Promise<number>;

  getReplyMarkup(): Promise<IReplyMarkup>;
}
