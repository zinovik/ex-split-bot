import * as http from 'http';
import * as url from 'url';

import * as indexFunction from './lambda/index';
import * as usersFunction from './lambda/users';
import * as testFunction from './lambda/test';

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT) || 9000;

interface ILambdaFunction {
  handler: (parameters: {
    body: any;
    queryStringParameters: { [key: string]: string | string[] };
  }) => Promise<{ body: string }>;
}

const LAMBDA_FUNCTIONS: { [key: string]: ILambdaFunction } = {
  '/index': indexFunction as ILambdaFunction,
  '/users': usersFunction as ILambdaFunction,
  '/test': testFunction as ILambdaFunction,
};

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');

  let body = '';
  req.on('readable', () => {
    body += req.read() || '';
  });

  req.on('end', async () => {
    const reqUrl = req.url || '';
    const [route] = reqUrl.split('?');

    const queryStringParameters = url.parse(reqUrl, true).query;

    try {
      if (LAMBDA_FUNCTIONS[route]) {
        const result = await LAMBDA_FUNCTIONS[route].handler({ body, queryStringParameters });
        res.end(result.body);
      } else {
        res.end('"Hello World"');
      }
    } catch (error) {
      res.end(`"${error.message}"`);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});
