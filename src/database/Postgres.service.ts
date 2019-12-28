import * as url from 'url';
import { createConnection, Connection } from 'typeorm';

import { IDatabaseService } from './IDatabaseService.interface';
import { User } from './entities/User.entity';
import { Game } from './entities/Game.entity';

export class PostgresService implements IDatabaseService {
  private getConnectionPromise: Promise<Connection>;

  constructor(private readonly databaseUrl: string) {
    this.databaseUrl = databaseUrl;
    const dbUrl = url.parse(databaseUrl);

    if (!dbUrl.host || !dbUrl.auth || !dbUrl.path) {
      throw new Error('Error parsing database config!');
    }

    this.getConnectionPromise = createConnection({
      type: 'postgres',
      host: dbUrl.host.split(':')[0],
      port: Number(dbUrl.port),
      username: dbUrl.auth.split(':')[0],
      password: dbUrl.auth.split(':')[1],
      database: dbUrl.path.split('/')[1],
      entities: [User, Game],
      synchronize: true,
      logging: true,
    });
  }

  async upsertUser({
    id,
    username,
    firstName,
    lastName,
  }: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void> {
    const balance = 0;

    const connection = await this.getConnectionPromise;
    await connection.query(
      `
      INSERT INTO "user" ("id", "balance", "username", "first_name", "last_name")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT ("id") DO UPDATE
      SET "username" = $3, "first_name" = $4, "last_name" = $5
      WHERE "user"."id" = $1
    `,
      [id, balance, username, firstName, lastName],
    );
  }

  async getUserBalance(userId: number): Promise<number> {
    const connection = await this.getConnectionPromise;
    const user = await connection
      .getRepository(User)
      .createQueryBuilder('user')
      .select(['user.balance'])
      .where({ id: userId })
      .getOne();

    if (user) {
      return user.balance;
    }

    return 0;
  }

  async setUserBalance(userId: number, balance: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(User).update(userId, { balance: balance });
  }

  async createGame(price: number, userId: number): Promise<number> {
    const connection = await this.getConnectionPromise;
    const a = await connection.getRepository(Game).insert({
      price,
      isFree: false,
      isDone: false,
      isDeleted: false,
      createdBy: { id: userId },
      payBy: { id: userId },
      playUsers: [{ id: userId }],
    });

    const gameId = a.identifiers[0].id;

    await this.addPlayUser(gameId, userId);

    return gameId;
  }

  async getGame(gameId: number): Promise<Game> {
    const connection = await this.getConnectionPromise;
    const game = await connection
      .getRepository(Game)
      .createQueryBuilder('game')
      .select([
        'game.id',
        'game.price',
        'game.isFree',
        'game.isDone',
        'game.isDeleted',
        'createdBy.id',
        'createdBy.username',
        'createdBy.firstName',
        'createdBy.lastName',
        'payBy.id',
        'payBy.username',
        'payBy.firstName',
        'payBy.lastName',
        'playUsers.id',
        'playUsers.balance',
        'playUsers.username',
        'playUsers.firstName',
        'playUsers.lastName',
      ])
      .leftJoin('game.createdBy', 'createdBy')
      .leftJoin('game.payBy', 'payBy')
      .leftJoin('game.playUsers', 'playUsers')
      .where({ id: gameId })
      .getOne();

    return game as Game;
  }

  async addPlayUser(gameId: number, userId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.query(
      `
      INSERT INTO "play" ("gameId", "userId")
      VALUES ($1, $2)
    `,
      [gameId, userId],
    );
  }

  async removePlayUser(gameId: number, userId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.query(
      `
      DELETE FROM "play"
      WHERE "gameId" = $1 AND "userId" = $2;
    `,
      [gameId, userId],
    );
  }

  async updatePayBy(gameId: number, userId: number | null): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Game).update(gameId, { payBy: { id: userId } as User });
  }

  async freeGame(gameId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Game).update(gameId, { isFree: true, payBy: null });
  }

  async notFreeGame(gameId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Game).update(gameId, { isFree: false });
  }

  async doneGame(gameId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Game).update(gameId, { isDone: true });
  }

  async editGame(gameId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Game).update(gameId, { isDone: false });
  }

  async deleteGame(gameId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Game).update(gameId, { isDeleted: true });
  }

  async restoreGame(gameId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Game).update(gameId, { isDeleted: false });
  }

  async getUsers(): Promise<User[]> {
    const connection = await this.getConnectionPromise;
    const users = await connection
      .getRepository(User)
      .createQueryBuilder('user')
      .select(['user.balance', 'user.username', 'user.firstName', 'user.lastName'])
      .orderBy('user.balance', 'DESC')
      .getMany();

    await this.closeConnection();

    return users;
  }

  async closeConnection(): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.close();
  }
}
