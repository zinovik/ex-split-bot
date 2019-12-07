import 'babel-polyfill';

import * as dotenv from 'dotenv';

import { ConfigParameterNotDefinedError } from './error/ConfigParameterNotDefinedError';
import { Badminton } from '../badminton/Badminton';
import { ConfigurationService } from '../configuration/Configuration.service';
import { PostgresService } from '../database/Postgres.service';
import { TelegramService } from '../telegram/Telegram.service';
import { MessageService } from '../message/Message.service';
import { IEvent } from './model/IEvent.interface';

dotenv.config();

exports.handler = async ({ body, queryStringParameters: { token } }: IEvent, context: never) => {
  if (process.env.GROUP_IDS === undefined) {
    throw new ConfigParameterNotDefinedError('GROUP_IDS');
  }
  if (process.env.TELEGRAM_TOKEN === undefined) {
    throw new ConfigParameterNotDefinedError('TELEGRAM_TOKEN');
  }
  if (process.env.DATABASE_URL === undefined) {
    throw new ConfigParameterNotDefinedError('DATABASE_URL');
  }
  if (process.env.GAME_COST === undefined) {
    throw new ConfigParameterNotDefinedError('GAME_COST');
  }
  if (process.env.TOKEN === undefined) {
    throw new ConfigParameterNotDefinedError('TOKEN');
  }

  if (token !== process.env.TOKEN) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: 'wrong token',
      }),
    };
  }

  const badminton = new Badminton(
    new ConfigurationService(
      process.env.GROUP_IDS.split(',').map(groupId => Number(groupId)),
      Number(process.env.GAME_COST),
    ),
    new PostgresService(process.env.DATABASE_URL),
    new TelegramService(process.env.TELEGRAM_TOKEN),
    new MessageService(),
  );

  try {
    await badminton.processMessage(body);
  } catch (error) {
    console.error('Unexpected error occurred.', error.message);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      result: 'success',
    }),
  };
};
