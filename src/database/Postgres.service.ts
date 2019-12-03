// import 'reflect-metadata';

import * as url from 'url';
import { createConnection } from 'typeorm';

import { IDatabaseService } from './IDatabaseService.interface';

export class PostgresService implements IDatabaseService {
  constructor(private readonly databaseUrl: string) {
    this.databaseUrl = databaseUrl;
  }

  async getUserBalance(username: string): Promise<number> {
    const dbUrl = url.parse(this.databaseUrl);

    // const connection = await createConnection({
    //   type: 'postgres',
    //   host: dbUrl.host!.split(':')[0],
    //   port: Number(dbUrl.port),
    //   username: dbUrl.auth!.split(':')[0],
    //   password: dbUrl.auth!.split(':')[1],
    //   database: dbUrl.path!.split('/')[1],
    //   entities: [__dirname + '/**/*.entity{.ts,.js}'],
    //   synchronize: true,
    // });

    return 0;
  }

  async setUserBalance(username: string, balance: number): Promise<void> {
    return;
  }
}
