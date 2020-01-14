import * as dotenv from 'dotenv';

import { ConfigParameterNotDefinedError } from '../common/error/ConfigParameterNotDefinedError';
import { Api } from '../api/Api';
import { PostgresService } from '../database/Postgres.service';
import { IEvent } from './model/IEvent.interface';
import { User } from '../database/entities/User.entity';

dotenv.config();

exports.handler = async (event: IEvent, context: never) => {
  if (process.env.DATABASE_URL === undefined) {
    throw new ConfigParameterNotDefinedError('DATABASE_URL');
  }

  const postgresService = new PostgresService(process.env.DATABASE_URL);

  const api = new Api(postgresService);

  let users: User[] = [];

  const chatUsername = event.queryStringParameters.group;

  try {
    users = chatUsername ? await api.getUsers(chatUsername) : [];
  } catch (error) {
    console.error('Unexpected error occurred: ', error.message);
  }

  try {
    await postgresService.closeConnection();
  } catch (error) {
    console.error('Error closing database connection: ', error.message);
  }

  const body = {
    result: 'success',
    users: users.map(u => ({
      ...u,
      balance: u.balances[0] ? Number(u.balances[0].amount) : 0,
      balances: undefined,
    })),
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
};
