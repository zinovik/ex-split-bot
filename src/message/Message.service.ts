import { IMessageService } from './IMessageService.interface';

import { IPhrases } from './phrases/IPhrases.interface';
import { en } from './phrases/en';
import { ru } from './phrases/ru';

const PHRASES: { [key: string]: IPhrases } = { en, ru };
const LANGUAGE = 'en';

export class MessageService implements IMessageService {
  async getGameInvitation({
    gameNumber,
    creator,
    playUsers,
    skipUsers,
    payUsers,
  }: {
    gameNumber: number;
    creator: string;
    playUsers: string[];
    skipUsers: string[];
    payUsers: string[];
  }): Promise<string> {
    console.log(gameNumber);

    return (
      `${creator} ${PHRASES[LANGUAGE].invitation}}\n\n` +
      `play: ${playUsers.join(', ')}\n\n` +
      `skip: ${skipUsers.join(', ')}\n\n` +
      `pay: ${payUsers.join(', ')}`
    );
  }
}
