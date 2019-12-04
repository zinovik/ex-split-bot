import * as url from 'url';
import { createConnection, Connection } from 'typeorm';

import { IDatabaseService } from './IDatabaseService.interface';
import { User } from './entities/User.entity';
import { Game } from './entities/Game.entity';

export class PostgresService implements IDatabaseService {
  constructor(private readonly databaseUrl: string) {
    this.databaseUrl = databaseUrl;
  }

  async getUserBalance(userId: number): Promise<number> {
    const connection = await this.getConnection();

    const user = await connection
      .getRepository(User)
      .createQueryBuilder('user')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (user) {
      return user.balance || 0;
    }

    return 0;
  }

  async setUserBalance({
    userId,
    balance,
    username,
    firstName,
    lastName,
  }: {
    userId: number;
    balance: number;
    username: string;
    firstName: string;
    lastName: string;
  }): Promise<void> {
    const connection = await this.getConnection();

    const user = new User();
    user.id = userId;
    user.balance = balance;
    user.username = username;
    user.firstName = firstName;
    user.username = lastName;

    await connection.manager.save(user);
  }

  async createGame({
    userId,
    price,
    username,
    firstName,
    lastName,
  }: {
    userId: number;
    price: number;
    username: string;
    firstName: string;
    lastName: string;
  }): Promise<Game> {
    const connection = await this.getConnection();

    // const user = new User();
    // user.id = userId;
    // user.username = username;
    // user.firstName = firstName;
    // user.username = lastName;
    // user.id = userId;
    // await connection.manager.save(user);
    return {} as Game;

    // const game = new Game();
    // game.id = 123;
    // game.price = price;
    // game.createdBy = user;
    // game.playUsers = [user];
    // game.skipUsers = [];
    // game.payUsers = [user];

    // return await connection.manager.save(game);
  }

  private async getConnection(): Promise<Connection> {
    const dbUrl = url.parse(this.databaseUrl);

    return await createConnection({
      type: 'postgres',
      host: dbUrl.host!.split(':')[0],
      port: Number(dbUrl.port),
      username: dbUrl.auth!.split(':')[0],
      password: dbUrl.auth!.split(':')[1],
      database: dbUrl.path!.split('/')[1],
      entities: [User, Game],
      synchronize: true,
    });
  }
}
