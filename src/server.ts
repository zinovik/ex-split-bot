import * as dotenv from 'dotenv';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as fs from 'fs';
import * as Rollbar from 'rollbar';
import { promisify } from 'util';

import { Main } from './main/Main';
import { Api } from './api/Api';
import { PostgresService } from './database/Postgres.service';
import { TelegramService } from './telegram/Telegram.service';
import { MessageService } from './message/Message.service';
import { ConfigParameterNotDefinedError } from './common/error/ConfigParameterNotDefinedError';

const app = express();
app.use(bodyParser.json());

if (process.env.ROLLBAR_ACCESS_TOKEN) {
  const rollbar = new Rollbar({
    accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
    captureUncaught: true,
    captureUnhandledRejections: true,
  });

  rollbar.log('Application was started!');
}

dotenv.config();

if (process.env.TELEGRAM_TOKEN === undefined) {
  throw new ConfigParameterNotDefinedError('TELEGRAM_TOKEN');
}
if (process.env.DATABASE_URL === undefined) {
  throw new ConfigParameterNotDefinedError('DATABASE_URL');
}
if (process.env.APP_TOKEN === undefined) {
  throw new ConfigParameterNotDefinedError('APP_TOKEN');
}

const PROTOCOL = 'http';
const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT) || 9000;

const postgresService = new PostgresService(process.env.DATABASE_URL);

const configuration = {
  publicUrl: process.env.PUBLIC_URL,
};

const main = new Main(
  configuration,
  postgresService,
  new TelegramService(process.env.TELEGRAM_TOKEN),
  new MessageService(),
);

const api = new Api(postgresService);

app.post('/index', async (req, res) => {
  const { token } = req.query;

  if (token !== process.env.APP_TOKEN) {
    res.status(401).json({ result: 'wrong token' });

    return;
  }

  try {
    await main.processMessage(JSON.stringify(req.body));
  } catch (error) {
    console.error('Unexpected error occurred: ', error.message);
  }

  res.json({ result: 'success' });
});

app.get('/users', async (req, res) => {
  const { group } = req.query;

  let users: { firstName?: string; username?: string; lastName?: string; balance: string; id: number }[] = [];

  try {
    users = group ? await api.getUsers(group as string) : [];
  } catch (error) {
    console.error('Unexpected error occurred: ', error.message);
  }

  const body = {
    result: 'success',
    users,
  };

  res.json(body);
});

app.get('/expenses', async (req, res) => {
  const { id } = req.query;

  let expenses: {
    username: string;
    balance: string;
    groups: {
      name: string;
      balance: string;
      expenses: { id: number; date: string; balance: string; name?: string }[];
    }[];
  } = {
    username: '',
    balance: '0',
    groups: [],
  };

  try {
    if (id) {
      expenses = await api.getExpenses(Number(id));
    }
  } catch (error) {
    console.error('Unexpected error occurred: ', error.message);
  }

  const body = {
    result: 'success',
    ...expenses,
  };

  res.json(body);
});

app.get('/groups', async (req, res) => {
  let groupsNames: string[] = [];

  try {
    groupsNames = await api.getGroupsNames();
  } catch (error) {
    console.error('Unexpected error occurred: ', error.message);
  }

  const body = {
    result: 'success',
    groups: groupsNames,
  };

  res.json(body);
});

app.get('/*', async (req, res) => {
  const indexBuffer = await promisify(fs.readFile)(`${process.cwd()}/public/index.html`);
  const indexString = indexBuffer.toString().replace(new RegExp('/.netlify/functions', 'g'), '');
  res.end(indexString);
});

app.listen(PORT, () => {
  console.log(`server started at ${PROTOCOL}://${HOST}:${PORT}`);
});
