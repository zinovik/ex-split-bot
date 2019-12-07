import { IMessageService } from './IMessageService.interface';
import { IReplyMarkup } from '../common/model/IReplyMarkup.interface';

import { User } from '../database/entities/User.entity';

export class MessageService implements IMessageService {
  async getGameInvitation({
    gameId,
    createdByUsername,
    playUsers,
    payByUsername,
    isFree,
    gameBalances,
  }: {
    gameId: number;
    createdByUsername: string;
    playUsers: User[];
    payByUsername: string;
    isFree: boolean;
    gameBalances: { username: string; gameBalance: number }[];
  }): Promise<string> {
    return (
      `Game #${gameId}\n\n` +
      `@${createdByUsername} invites to play ${isFree ? 'for free ' : ''}today!\n\n` +
      `Balances before game:` +
      `${playUsers.map(u => `\n@${u.username}: ${u.balance}`)}` +
      `\n\nplay: ${playUsers.map(u => `@${u.username}`).join(', ')}` +
      (isFree
        ? ''
        : `\npay: ${payByUsername ? '@' : ''}${payByUsername}\n\n` +
          `Game balances:` +
          `${gameBalances.map(u => `\n@${u.username}: ${u.gameBalance}`)}`)
    );
  }

  async parseGameId(text: string): Promise<number> {
    return Number(text.split('\n')[0].replace('Game #', ''));
  }

  async getReplyMarkup(): Promise<IReplyMarkup> {
    return {
      inline_keyboard: [
        [
          { text: 'play', callback_data: 'play' },
          { text: 'pay', callback_data: 'pay' },
          { text: 'free', callback_data: 'free' },
          { text: 'done', callback_data: 'done' },
          { text: 'delete', callback_data: 'delete' },
        ],
      ],
    };
  }
}
