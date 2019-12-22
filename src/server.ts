import * as http from 'http';

import * as indexFunction from './lambda/index';
import * as usersFunction from './lambda/users';
import * as testFunction from './lambda/test';

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT) || 9000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');

  let body = '';
  req.on('readable', () => {
    body += req.read() || '';
  });

  req.on('end', async () => {
    const reqUrl = req.url || '';

    try {
      if (reqUrl.startsWith('/index')) {
        const token = reqUrl.replace('/index?token=', '');
        const result = await (indexFunction as any).handler({ body, queryStringParameters: { token } });
        res.end(result.body);
      } else if (reqUrl.startsWith('/users')) {
        const result = await (usersFunction as any).handler();
        res.end(result.body);
      } else if (reqUrl.startsWith('/test')) {
        const result = await (testFunction as any).handler();
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
