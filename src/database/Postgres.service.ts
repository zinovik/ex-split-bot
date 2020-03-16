import * as url from 'url';
import Fraction from 'fraction.js';
import { createConnection, Connection, In } from 'typeorm';

import { IDatabaseService } from './IDatabaseService.interface';
import { User } from './entities/User.entity';
import { Expense } from './entities/Expense.entity';
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
      entities: [User, Expense, Group, Balance],
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

  async getGroupDefaults(
    chatId: number,
  ): Promise<{ defaultPrice?: number | null; defaultExpenseName?: string | null; defaultActionName?: string | null }> {
    const connection = await this.getConnectionPromise;

    const { defaultPrice, defaultExpense, defaultAction } =
      (await connection
        .getRepository(Group)
        .createQueryBuilder('group')
        .select(['group.defaultPrice', 'group.defaultExpense', 'group.defaultAction'])
        .where({ id: chatId })
        .getOne()) || {};

    return { defaultPrice, defaultExpenseName: defaultExpense, defaultActionName: defaultAction };
  }

  async getUserBalance(userId: number, chatId: number): Promise<string> {
    const connection = await this.getConnectionPromise;
    const balance = await connection
      .getRepository(Balance)
      .createQueryBuilder('balance')
      .select(['balance.amountPrecise'])
      .where({ user: userId, group: chatId })
      .getOne();

    if (balance && balance.amountPrecise) {
      return balance.amountPrecise;
    }

    return '0';
  }

  async setUserBalance(userId: number, chatId: number, balance: string): Promise<void> {
    const connection = await this.getConnectionPromise;

    await connection
      .getRepository(Balance)
      .update({ user: { id: userId }, group: { id: String(chatId) } }, { amountPrecise: balance });
  }

  async createExpense(
    price: number,
    userId: number,
    chatId: number,
    expenseName?: string,
    actionName?: string,
  ): Promise<number> {
    const connection = await this.getConnectionPromise;
    const insertResult = await connection.getRepository(Expense).insert({
      price,
      expenseName,
      actionName,
      isFree: false,
      isDone: false,
      isDeleted: false,
      createdBy: { id: userId },
      payBy: { id: userId },
      group: { id: String(chatId) },
      messageId: 0,
    });

    const expenseId = insertResult.identifiers[0].id;

    await this.addPlayUser(expenseId, userId);

    return expenseId;
  }

  async addExpenseMessageId(expenseId: number, messageId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Expense).update(expenseId, { messageId });
  }

  async getExpense(chatId: number, messageId: number): Promise<Expense> {
    const connection = await this.getConnectionPromise;
    const expense = await connection
      .getRepository(Expense)
      .createQueryBuilder('expense')
      .select([
        'expense.id',
        'expense.price',
        'expense.messageId',
        'expense.isFree',
        'expense.isDone',
        'expense.isDeleted',
        'expense.expenseName',
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
        'balances.amountPrecise',
      ])
      .leftJoin('expense.createdBy', 'createdBy')
      .leftJoin('expense.payBy', 'payBy')
      .leftJoin('expense.playUsers', 'playUsers')
      .leftJoin('playUsers.balances', 'balances')
      .where({ messageId, group: { id: chatId } })
      .andWhere('balances.group = :chatId OR balances.group is null', { chatId })
      .getOne();

    return expense as Expense;
  }

  async addPlayUser(expenseId: number, userId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.query(
      `
      INSERT INTO "play" ("expenseId", "userId")
      VALUES ($1, $2)
    `,
      [expenseId, userId],
    );
  }

  async removePlayUser(expenseId: number, userId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.query(
      `
      DELETE FROM "play"
      WHERE "expenseId" = $1 AND "userId" = $2;
    `,
      [expenseId, userId],
    );
  }

  async updatePayBy(expenseId: number, userId: number | null): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Expense).update(expenseId, { payBy: { id: userId } as User });
  }

  async freeExpense(expenseId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Expense).update(expenseId, { isFree: true, payBy: null });
  }

  async notFreeExpense(expenseId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Expense).update(expenseId, { isFree: false });
  }

  async doneExpense(expenseId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Expense).update(expenseId, { isDone: true });
  }

  async editExpense(expenseId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Expense).update(expenseId, { isDone: false });
  }

  async deleteExpense(expenseId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Expense).update(expenseId, { isDeleted: true });
  }

  async restoreExpense(expenseId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Expense).update(expenseId, { isDeleted: false });
  }

  async setDefaultPrice(chatId: number, defaultPrice: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Group).update(chatId, { defaultPrice });
  }

  async setDefaultExpenseName(chatId: number, defaultExpenseName: string): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Group).update(chatId, { defaultExpense: defaultExpenseName });
  }

  async setDefaultActionName(chatId: number, defaultActionName: string): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Group).update(chatId, { defaultAction: defaultActionName });
  }

  async removeDefaultPrice(chatId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Group).update(chatId, { defaultPrice: undefined });
  }

  async removeDefaultExpenseName(chatId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Group).update(chatId, { defaultExpense: undefined });
  }

  async removeDefaultActionName(chatId: number): Promise<void> {
    const connection = await this.getConnectionPromise;
    await connection.getRepository(Group).update(chatId, { defaultAction: undefined });
  }

  async getUsers(
    group: string,
  ): Promise<{ firstName?: string; username?: string; lastName?: string; balance: string; id: number }[]> {
    const connection = await this.getConnectionPromise;

    const users = await connection
      .getRepository(User)
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.firstName',
        'user.lastName',
        'balances.amountPrecise',
        'group.username',
      ])
      .leftJoin('user.balances', 'balances')
      .innerJoin('balances.group', 'group', 'group.username = :chatUsername', { chatUsername: group })
      .getMany();

    users.sort((user1, user2) => {
      const user1balance = user1.balances[0] ? user1.balances[0].amountPrecise : '0';
      const user2balance = user2.balances[0] ? user2.balances[0].amountPrecise : '0';

      return new Fraction(user2balance).sub(new Fraction(user1balance)).valueOf();
    });

    return users.map(u => ({
      ...u,
      balance: u.balances[0] ? u.balances[0].amountPrecise : '0',
      balances: undefined,
    }));
  }

  async getExpenses(id: number): Promise<Expense[]> {
    const connection = await this.getConnectionPromise;

    const expensesWithoutSplitUsers = await connection
      .getRepository(Expense)
      .createQueryBuilder('expense')
      .select([
        'expense.id',
        'expense.price',
        'expense.expenseName',
        'expense.createdAt',
        'expense.isFree',
        'payBy.id',
        'payBy.username',
        'playUsers.id',
        'playUsers.username',
        'group.username',
        'group.id',
      ])
      .leftJoin('expense.payBy', 'payBy')
      .leftJoin('expense.playUsers', 'playUsers')
      .leftJoin('playUsers.balances', 'balances')
      .leftJoin('expense.group', 'group')
      .where({ isDone: true, isDeleted: false })
      .andWhere('(playUsers.id = :id OR payBy.id = :id)', { id })
      .orderBy('expense.id')
      .getMany();

    const expenses = await connection
      .getRepository(Expense)
      .createQueryBuilder('expense')
      .select([
        'expense.id',
        'expense.price',
        'expense.expenseName',
        'expense.createdAt',
        'expense.isFree',
        'payBy.id',
        'payBy.username',
        'playUsers.id',
        'playUsers.username',
        'group.username',
        'group.id',
      ])
      .leftJoin('expense.payBy', 'payBy')
      .leftJoin('expense.playUsers', 'playUsers')
      .leftJoin('playUsers.balances', 'balances')
      .leftJoin('expense.group', 'group')
      .where({ id: In(expensesWithoutSplitUsers.map(e => e.id)) })
      .orderBy('expense.id', 'DESC')
      .getMany();

    return expenses;
  }

  async getGroupsNames(): Promise<string[]> {
    const connection = await this.getConnectionPromise;

    const groups = await connection
      .getRepository(Group)
      .createQueryBuilder('group')
      .getMany();

    return groups.filter(group => group.username).map(group => group.username) as string[];
  }

  async closeConnection(): Promise<void> {
    const connection = await this.getConnectionPromise;

    await connection.close();
  }
}
