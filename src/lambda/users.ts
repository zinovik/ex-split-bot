import * as dotenv from 'dotenv';

import { ConfigParameterNotDefinedError } from './error/ConfigParameterNotDefinedError';
import { Api } from '../api/Api';
import { PostgresService } from '../database/Postgres.service';
import { IEvent } from './model/IEvent.interface';
import { User } from '../database/entities/User.entity';

dotenv.config();

exports.handler = async (event: IEvent, context: never) => {
  if (process.env.DATABASE_URL === undefined) {
    throw new ConfigParameterNotDefinedError('DATABASE_URL');
  }

  const api = new Api(new PostgresService(process.env.DATABASE_URL));

  let users: User[] = [];

  try {
    users = await api.getUsers();
  } catch (error) {
    console.error('Unexpected error occurred: ', error.message);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      result: 'success',
      users,
    }),
  };
};
