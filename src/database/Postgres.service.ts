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

  async upsertUser(user: User): Promise<void> {
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
      [user.id, balance, user.username, user.firstName, user.lastName],
    );
  }

  async getUserBalance(userId: number): Promise<number> {
    await this.createConnection();

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
    await this.createConnection();

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
    await this.createConnection();

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
    await this.createConnection();

    const [game] = await this.connection.query(
      `
      SELECT "id", "price", "is_free" as "isFree", "is_done" as "isDone", "is_deleted" as "isDeleted",
             "created_by" as "createdById", "pay_by" as "payById"
      FROM "game"
      WHERE "game"."id" = $1
    `,
      [gameId],
    );

    const users = await this.connection.query(
      `
      SELECT "id", "balance", "username", "first_name" as "firstName", "last_name" as "lastName"
      FROM "user"
    `,
    );

    const playUsers = await this.connection.query(
      `
      SELECT "userId"
      FROM "play"
      WHERE "play"."gameId" = $1
    `,
      [gameId],
    );

    return {
      ...game,
      playUsers: playUsers.map(({ userId }: { userId: number }) => users.find((u: User) => u.id === userId)),
      createdBy: users.find((u: User) => u.id === game.createdById),
      payBy: users.find((u: User) => u.id === game.payById),
    };
  }

  async addPlayUser(gameId: number, userId: number): Promise<void> {
    await this.createConnection();

    await this.connection.query(
      `
      INSERT INTO "play" ("gameId", "userId")
      VALUES ($1, $2)
    `,
      [gameId, userId],
    );
  }

  async removePlayUser(gameId: number, userId: number): Promise<void> {
    await this.createConnection();

    await this.connection.query(
      `
      DELETE FROM "play"
      WHERE "gameId" = $1 AND "userId" = $2;
    `,
      [gameId, userId],
    );
  }

  async updatePayBy(gameId: number, userId: number | null): Promise<void> {
    await this.createConnection();

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

    this.connection = await createConnection({
      type: 'postgres',
      host: dbUrl.host!.split(':')[0],
      port: Number(dbUrl.port),
      username: dbUrl.auth!.split(':')[0],
      password: dbUrl.auth!.split(':')[1],
      database: dbUrl.path!.split('/')[1],
      entities: [User, Game],
      synchronize: true,
      logging: true,
    });
  }
}
