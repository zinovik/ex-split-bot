import * as dotenv from 'dotenv';

import { ConfigParameterNotDefinedError } from '../common/error/ConfigParameterNotDefinedError';
import { Api } from '../api/Api';
import { PostgresService } from '../database/Postgres.service';
import { IEvent } from './model/IEvent.interface';

dotenv.config();

exports.handler = async (event: IEvent, context: never) => {
  if (process.env.DATABASE_URL === undefined) {
    throw new ConfigParameterNotDefinedError('DATABASE_URL');
  }

  const postgresService = new PostgresService(process.env.DATABASE_URL);

  const api = new Api(postgresService);

  let expenses: {
    id: number;
    date: string;
    balance: string;
    name?: string;
    group: string;
  }[] = [];

  const id = event.queryStringParameters.id;

  try {
    expenses = id ? await api.getExpenses(Number(id)) : [];
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
    expenses,
    balance: api.getBalance(expenses),
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
};
