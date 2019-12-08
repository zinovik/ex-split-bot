import { IMessageService } from './IMessageService.interface';
import { IReplyMarkup } from '../common/model/IReplyMarkup.interface';

import { User } from '../database/entities/User.entity';

export class MessageService implements IMessageService {
  getUserMarkdown({ username, firstName, id }: { username?: string; firstName?: string; id: number }): string {
    return `[${firstName || username || String(id)}](tg://user?id=${String(id)})`;
  }

  async getGameInvitation({
    gameId,
    createdByUserMarkdown,
    playUsers,
    payByUserMarkdown,
    isFree,
    gameBalances,
  }: {
    gameId: number;
    createdByUserMarkdown: string;
    playUsers: User[];
    payByUserMarkdown: string;
    isFree: boolean;
    gameBalances: { userMarkdown: string; gameBalance: number }[];
  }): Promise<string> {
    return (
      `Game #${gameId}\n\n` +
      `${createdByUserMarkdown} invites to play ${isFree ? 'for FREE ' : ''}today!\n\n` +
      `Balances before game:` +
      `${playUsers.map(u => `\n${this.getUserMarkdown(u)}: ${u.balance} BYN`)}` +
      `\n\nplay: ${playUsers.map(u => `${this.getUserMarkdown(u)}`).join(', ')}` +
      (isFree
        ? ''
        : `\npay: ${payByUserMarkdown}\n\n` +
          `Game balances:` +
          `${gameBalances.map(u => `\n${u.userMarkdown}: ${u.gameBalance} BYN`)}`)
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
