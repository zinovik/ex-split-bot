import 'core-js/stable';
import 'regenerator-runtime/runtime';

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
  console.log('New request');

  if (process.env.CHAT_USERNAME === undefined) {
    throw new ConfigParameterNotDefinedError('CHAT_USERNAME');
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
  if (process.env.ADMIN_IDS === undefined) {
    throw new ConfigParameterNotDefinedError('ADMIN_IDS');
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
      process.env.CHAT_USERNAME,
      Number(process.env.GAME_COST),
      process.env.ADMIN_IDS.split(',').map(adminId => Number(adminId)),
    ),
    new PostgresService(process.env.DATABASE_URL),
    new TelegramService(process.env.TELEGRAM_TOKEN),
    new MessageService(),
  );

  try {
    await badminton.processMessage(body);
  } catch (error) {
    console.error('Unexpected error occurred: ', error.message);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      result: 'success',
    }),
  };
};
