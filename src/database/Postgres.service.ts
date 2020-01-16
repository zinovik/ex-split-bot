import * as url from 'url';
import { createConnection, Connection } from 'typeorm';

import { IDatabaseService } from './IDatabaseService.interface';
import { User } from './entities/User.entity';
import { Game } from './entities/Game.entity';
import { Group } from './entities/Group.entity';
import { Balance } from './entities/Balance.entity';

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
      entities: [User, Game, Group, Balance],
      synchronize: true,
      logging: true,
    });
  }

  async upsertUser({
    userId,
    chatId,
    userUsername,
    chatUsername,
    firstName,
    lastName,
  }: {
    userId: number;
    chatId: number;
    userUsername?: string;
    chatUsername?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void> {
    const connection = await this.getConnectionPromise;

    const group = new Group();
    group.id = String(chatId);
    group.username = chatUsername;
    await connection.getRepository(Group).save(group);

    const user = new User();
    user.id = userId;
    user.username = userUsername;
    user.firstName = firstName;
    user.lastName = lastName;
    await connection.getRepository(User).save(user);

    const balance = new Balance();
    balance.user = user;
    balance.group = group;
    await connection.getRepository(Balance).save(balance);
  }

  async getUserBalance(userId: number, chatId: number): Promise<number> {
    const connection = await this.getConnectionPromise;
    const balance = await connection
      .getRepository(Balance)
      .createQueryBuilder('balance')
      .select(['balance.amount'])
      .where({ user: userId, group: chatId })
      .getOne();

    if (balance) {
      return balance.amount;
    }

    return 0;
  }

  async setUserBalance(userId: number, chatId: number, balance: number): Promise<void> {
    const connection = await this.getConnectionPromise;

    await connection
      .getRepository(Balance)
      .update({ user: { id: userId }, group: { id: String(chatId) } }, { amount: balance });
  }

  async createGame(price: number, userId: number, chatId: number): Promise<number> {
    const connection = await this.getConnectionPromise;
    const a = await connection.getRepository(Game).insert({
      price,
      isFree: false,
      isDone: false,
      isDeleted: false,
      createdBy: { id: userId },
      payBy: { id: userId },
      playUsers: [{ id: userId }],
      group: { id: String(chatId) },
    });

    const gameId = a.identifiers[0].id;

    await this.addPlayUser(gameId, userId);

    return gameId;
  }

  async addGameMessageId(gameId: number, messageId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Game).update(gameId, { messageId });
  }

  async getGame(gameId: number, chatId: number): Promise<Game> {
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
        'playUsers.username',
        'playUsers.firstName',
        'playUsers.lastName',
        'balances.amount',
      ])
      .leftJoin('game.createdBy', 'createdBy')
      .leftJoin('game.payBy', 'payBy')
      .leftJoin('game.playUsers', 'playUsers')
      .leftJoin('playUsers.balances', 'balances')
      .innerJoin('balances.group', 'group', 'group.id = :chatId', { chatId })
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

  async getUsers(chatUsername: string): Promise<User[]> {
    const connection = await this.getConnectionPromise;

    const users = await connection
      .getRepository(User)
      .createQueryBuilder('user')
      .select(['user.username', 'user.firstName', 'user.lastName', 'balances.amount', 'group.username'])
      .leftJoin('user.balances', 'balances')
      .innerJoin('balances.group', 'group', 'group.username = :chatUsername', { chatUsername })
      .orderBy('balances.amount', 'DESC')
      .getMany();

    return users;
  }

  async closeConnection(): Promise<void> {
    const connection = await this.getConnectionPromise;

    await connection.close();
  }
}
