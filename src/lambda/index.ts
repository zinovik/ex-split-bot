import 'babel-polyfill';

import * as dotenv from 'dotenv';

import { ConfigParameterNotDefinedError } from './error/ConfigParameterNotDefinedError';
import { Badminton } from '../badminton/Badminton';
import { HardcodeConfigurationService } from '../configuration/HardcodeConfiguration.service';
import { MemoryService } from '../database/Memory.service';
import { TelegramService } from '../telegram/Telegram.service';
import { IEvent } from './model/IEvent.interface';

dotenv.config();

exports.handler = async ({ body }: IEvent, context: never) => {
  if (process.env.TOKEN === undefined) {
    throw new ConfigParameterNotDefinedError('TOKEN');
  }
  if (process.env.CHANNEL_ID === undefined) {
    throw new ConfigParameterNotDefinedError('CHANNEL_ID');
  }

  const badminton = new Badminton(
    new HardcodeConfigurationService(Number(process.env.CHANNEL_ID)),
    new MemoryService(),
    new TelegramService(process.env.TOKEN),
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
