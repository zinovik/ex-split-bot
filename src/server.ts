import * as dotenv from 'dotenv';
import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import * as Rollbar from 'rollbar';
import { promisify } from 'util';

import { Main } from './main/Main';
import { Api } from './api/Api';
import { ConfigurationService } from './configuration/Configuration.service';
import { PostgresService } from './database/Postgres.service';
import { TelegramService } from './telegram/Telegram.service';
import { MessageService } from './message/Message.service';
import { ConfigParameterNotDefinedError } from './common/error/ConfigParameterNotDefinedError';
import { User } from './database/entities/User.entity';

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

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT) || 9000;

const postgresService = new PostgresService(process.env.DATABASE_URL);

const main = new Main(postgresService, new TelegramService(process.env.TELEGRAM_TOKEN), new MessageService());

const api = new Api(postgresService);

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Access-Control-Allow-Origin', '*');

  let body = '';
  req.on('readable', () => {
    body += req.read() || '';
  });

  req.on('end', async () => {
    const reqUrl = req.url || '';
    const [route] = reqUrl.split('?');

    const queryStringParameters = url.parse(reqUrl, true).query;

    try {
      if (route === '/index') {
        const { token } = queryStringParameters;

        if (token !== process.env.APP_TOKEN) {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              statusCode: 401,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                result: 'wrong token',
              }),
            }),
          );

          return;
        }

        try {
          await main.processMessage(body);
        } catch (error) {
          console.error('Unexpected error occurred: ', error.message);
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            result: 'success',
          }),
        );
      } else if (route === '/users') {
        const { group } = queryStringParameters;

        let users: User[] = [];

        try {
          users = group ? await api.getUsers(group as string) : [];
        } catch (error) {
          console.error('Unexpected error occurred: ', error.message);
        }

        const body = {
          result: 'success',
          users: users.map(u => ({
            ...u,
            balance: u.balances[0] ? Number(u.balances[0].amount) : 0,
            balances: undefined,
          })),
        };

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(body));
      } else if (route === '/groups') {
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

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(body));
      } else {
        const indexBuffer = await promisify(fs.readFile)(`${process.cwd()}/public/index.html`);
        const indexString = indexBuffer.toString().replace('/.netlify/functions', '');
        res.end(indexString);
      }
    } catch (error) {
      res.end(`"${error.message}"`);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});
