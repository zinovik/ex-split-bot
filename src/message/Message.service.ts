import { IMessageService } from './IMessageService.interface';

import { IPhrases } from './phrases/IPhrases.interface';
import { en } from './phrases/en';
import { ru } from './phrases/ru';

const PHRASES: { [key: string]: IPhrases } = { en, ru };
const LANGUAGE = 'en';

export class MessageService implements IMessageService {
  async getGameInvitation(username: string): Promise<string> {
    return `${username} ${PHRASES[LANGUAGE].invitation}`;
  }
}
