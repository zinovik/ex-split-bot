import { IMessageService } from './IMessageService.interface';
import { IReplyMarkup } from '../common/model/IReplyMarkup.interface';

export class MessageService implements IMessageService {
  getUserMarkdown({ username, firstName, id }: { username?: string; firstName?: string; id: number }): string {
    return `[${firstName || username || String(id)}](tg://user?id=${String(id)})`;
  }

  getGameMessageText({
    gameId,
    createdByUserMarkdown,
    playUsers,
    payByUserMarkdown,
    isFree = false,
    gameCost = 0,
    gameBalances,
  }: {
    gameId: number;
    createdByUserMarkdown: string;
    playUsers: { username?: string; firstName?: string; id: number; balance: number }[];
    payByUserMarkdown: string;
    isFree?: boolean;
    gameCost?: number;
    gameBalances: { userMarkdown: string; gameBalance: number }[];
  }): string {
    return (
      `${this.getGameNumber(gameId)}\n` +
      `\n` +
      `${this.getGameCreated(createdByUserMarkdown, isFree, gameCost)}\n` +
      `\n` +
      (isFree ? '' : `${this.getBalancesBeforeGame(playUsers)}\n` + `\n`) +
      `${this.getPlayUsers(playUsers)}` +
      (isFree ? '' : `\n` + `${this.getPayUser(payByUserMarkdown)}\n` + `\n` + this.getGameBalances(gameBalances))
    );
  }

  private getGameNumber(gameId: number): string {
    return `Game #${gameId}`;
  }

  private getGameCreated(createdByUserMarkdown: string, isFree: boolean, gameCost: number): string {
    return `${createdByUserMarkdown} invites to play${isFree ? ' for FREE' : ''}!${
      isFree ? '' : `\nGame cost: ${gameCost} BYN`
    }`;
  }

  private getBalancesBeforeGame(
    playUsers: { username?: string; firstName?: string; id: number; balance: number }[],
  ): string {
    return `Balances before the game:` + `${playUsers.map(u => `\n${this.getUserMarkdown(u)}: ${u.balance} BYN`)}`;
  }

  private getPlayUsers(playUsers: { username?: string; firstName?: string; id: number }[]): string {
    return `play: ${playUsers.map(u => `${this.getUserMarkdown(u)}`).join(', ')}`;
  }

  private getPayUser(payByUserMarkdown: string): string {
    return `pay: ${payByUserMarkdown}`;
  }

  private getGameBalances(gameBalances: { userMarkdown: string; gameBalance: number }[]): string {
    return `Game balances:` + `${gameBalances.map(u => `\n${u.userMarkdown}: ${u.gameBalance} BYN`)}`;
  }

  getDeletedGameMessageText({
    gameId,
    createdByUserMarkdown,
  }: {
    gameId: number;
    createdByUserMarkdown: string;
  }): string {
    return `${this.getGameNumber(gameId)}\n` + `Game created by ${createdByUserMarkdown} was deleted :(`;
  }

  parseGameId(text: string): number {
    return Number(text.split('\n')[0].replace('Game #', ''));
  }

  getReplyMarkup(isFree = false): IReplyMarkup {
    return {
      inline_keyboard: [
        [
          { text: 'play', callback_data: 'play' },
          ...(isFree ? [] : [{ text: 'pay', callback_data: 'pay' }]),
          { text: 'free', callback_data: 'free' },
          { text: 'done', callback_data: 'done' },
          { text: 'delete', callback_data: 'delete' },
        ],
      ],
    };
  }

  getDoneGameReplyMarkup(): IReplyMarkup {
    return {
      inline_keyboard: [[{ text: 'edit', callback_data: 'edit' }]],
    };
  }

  getDeletedGameReplyMarkup(): IReplyMarkup {
    return {
      inline_keyboard: [[{ text: 'restore', callback_data: 'restore' }]],
    };
  }
}
