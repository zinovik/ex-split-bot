import * as dotenv from 'dotenv';

import { IEvent } from './model/IEvent.interface';

dotenv.config();

exports.handler = async (event: IEvent, context: never) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      result: 'success',
      gameCost: process.env.GAME_COST,
      chatUsername: process.env.CHAT_USERNAME,
      adminIds: process.env.ADMIN_IDS,
      databaseUrl: process.env.DATABASE_URL,
    }),
  };
};
