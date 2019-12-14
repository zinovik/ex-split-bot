import * as url from 'url';
import { createConnection, Connection } from 'typeorm';

import { IDatabaseService } from './IDatabaseService.interface';
import { User } from './entities/User.entity';
import { Game } from './entities/Game.entity';

export class PostgresService implements IDatabaseService {
  private connection: Connection;

  constructor(private readonly databaseUrl: string) {
    this.databaseUrl = databaseUrl;
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
    await this.createConnection();

    const balance = 0;

    await this.connection.query(
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
    const users = await this.connection.query(
      `
      SELECT "balance"
      FROM "user"
      WHERE "user"."id" = $1
    `,
      [userId],
    );

    if (users.length) {
      return users[0].balance || 0;
    }

    return 0;
  }

  async setUserBalance(userId: number, balance: number): Promise<void> {
    await this.connection.query(
      `
      UPDATE "user"
      SET "balance" = $2
      WHERE "user"."id" = $1
    `,
      [userId, balance],
    );
  }

  async createGame(price: number, userId: number): Promise<number> {
    const [{ id: gameId }] = await this.connection.query(
      `
      INSERT INTO "game" ("price", "is_free", "is_done", "is_deleted", "created_by", "pay_by")
      VALUES ($1, $2, $2, $2, $3, $3)
      RETURNING "id"
    `,
      [price, false, userId],
    );

    await this.addPlayUser(gameId, userId);

    return gameId;
  }

  async getGame(gameId: number): Promise<Game> {
    const [selectedGame] = await this.connection.query(
      `
      SELECT "game"."id", "price", "is_free" as "isFree", "is_done" as "isDone", "is_deleted" as "isDeleted",
             "created_by"."id" as "createdBy.id",
             "created_by"."username" as "createdBy.username",
             "created_by"."first_name" as "createdBy.firstName",
             "created_by"."last_name" as "createdBy.lastName",
             "pay_by"."id" as "payBy.id",
             "pay_by"."username" as "payBy.username",
             "pay_by"."first_name" as "payBy.firstName",
             "pay_by"."last_name" as "payBy.lastName"
      FROM "game"
      LEFT JOIN "user" "created_by" on "game"."created_by" = "created_by"."id"
      LEFT JOIN "user" "pay_by" on "game"."pay_by" = "pay_by"."id"
      WHERE "game"."id" = $1
    `,
      [gameId],
    );

    const playUsers = await this.connection.query(
      `
      SELECT "id", "balance", "username", "first_name" as "firstName", "last_name" as "lastName"
      FROM "user"
      where "user"."id" IN (SELECT "userId"
                            FROM "play"
                            WHERE "play"."gameId" = $1)
    `,
      [gameId],
    );

    const game = {
      ...selectedGame,
      playUsers,
      createdBy: {
        id: selectedGame['createdBy.id'],
        username: selectedGame['createdBy.username'],
        firstName: selectedGame['createdBy.firstName'],
        lastName: selectedGame['createdBy.lastName'],
      },
      payBy: selectedGame['payBy.id'] && {
        id: selectedGame['payBy.id'],
        username: selectedGame['payBy.username'],
        firstName: selectedGame['payBy.firstName'],
        lastName: selectedGame['payBy.lastName'],
      },
    };

    return game;
  }

  async addPlayUser(gameId: number, userId: number): Promise<void> {
    await this.connection.query(
      `
      INSERT INTO "play" ("gameId", "userId")
      VALUES ($1, $2)
    `,
      [gameId, userId],
    );
  }

  async removePlayUser(gameId: number, userId: number): Promise<void> {
    await this.connection.query(
      `
      DELETE FROM "play"
      WHERE "gameId" = $1 AND "userId" = $2;
    `,
      [gameId, userId],
    );
  }

  async updatePayBy(gameId: number, userId: number | null): Promise<void> {
    await this.connection.query(
      `
      UPDATE "game"
      SET "pay_by" = $2
      WHERE "game"."id" = $1
    `,
      [gameId, userId],
    );
  }

  async freeGame(gameId: number): Promise<void> {
    await this.connection.query(
      `
      UPDATE "game"
      SET "is_free" = $2, "pay_by" = $3
      WHERE "game"."id" = $1
    `,
      [gameId, true, null],
    );
  }

  async notFreeGame(gameId: number): Promise<void> {
    await this.connection.query(
      `
      UPDATE "game"
      SET "is_free" = $2
      WHERE "game"."id" = $1
    `,
      [gameId, false],
    );
  }

  async doneGame(gameId: number): Promise<void> {
    await this.connection.query(
      `
      UPDATE "game"
      SET "is_done" = $2
      WHERE "game"."id" = $1
    `,
      [gameId, true],
    );
  }

  async undoneGame(gameId: number): Promise<void> {
    await this.connection.query(
      `
      UPDATE "game"
      SET "is_done" = $2
      WHERE "game"."id" = $1
    `,
      [gameId, false],
    );
  }

  async deleteGame(gameId: number): Promise<void> {
    await this.connection.query(
      `
      UPDATE "game"
      SET "is_deleted" = $2
      WHERE "game"."id" = $1
    `,
      [gameId, true],
    );
  }

  async restoreGame(gameId: number): Promise<void> {
    await this.connection.query(
      `
      UPDATE "game"
      SET "is_deleted" = $2
      WHERE "game"."id" = $1
    `,
      [gameId, false],
    );
  }

  async getUsers(): Promise<User[]> {
    await this.createConnection();

    const users = await this.connection.query(
      `
      SELECT "balance", "username", "first_name" as "firstName", "last_name" as "lastName"
      FROM "user"
    `,
    );

    await this.closeConnection();

    return users;
  }

  async closeConnection(): Promise<void> {
    if (!this.connection) {
      return;
    }

    await this.connection.close();
  }

  private async createConnection(): Promise<void> {
    if (this.connection) {
      return;
    }

    const dbUrl = url.parse(this.databaseUrl);

    if (!dbUrl.host || !dbUrl.auth || !dbUrl.path) {
      throw new Error('Error parsing database config!');
    }

    this.connection = await createConnection({
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
}
