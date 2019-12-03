import 'babel-polyfill';

import * as dotenv from 'dotenv';

import { ConfigParameterNotDefinedError } from './error/ConfigParameterNotDefinedError';
import { Badminton } from '../badminton/Badminton';
import { HardcodeConfigurationService } from '../configuration/HardcodeConfiguration.service';
import { PostgresService } from '../database/Postgres.service';
import { TelegramService } from '../telegram/Telegram.service';
import { MessageService } from '../message/Message.service';
import { IEvent } from './model/IEvent.interface';

dotenv.config();

exports.handler = async ({ body }: IEvent, context: never) => {
  if (process.env.CHANNEL_ID === undefined) {
    throw new ConfigParameterNotDefinedError('CHANNEL_ID');
  }
  if (process.env.TOKEN === undefined) {
    throw new ConfigParameterNotDefinedError('TOKEN');
  }
  if (process.env.DATABASE_URL === undefined) {
    throw new ConfigParameterNotDefinedError('DATABASE_URL');
  }

  const badminton = new Badminton(
    new HardcodeConfigurationService(Number(process.env.CHANNEL_ID)),
    new PostgresService(process.env.DATABASE_URL),
    new TelegramService(process.env.TOKEN),
    new MessageService(),
  );

  try {
    await badminton.process(body);
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
