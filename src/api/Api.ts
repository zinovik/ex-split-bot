import Fraction from 'fraction.js';

import { IApi } from './IApi.interface';
import { IDatabaseService } from '../database/IDatabaseService.interface';

export class Api implements IApi {
  constructor(private readonly databaseService: IDatabaseService) {
    this.databaseService = databaseService;
  }

  async getUsers(
    group: string,
  ): Promise<{ firstName?: string; username?: string; lastName?: string; balance: string }[]> {
    return await this.databaseService.getUsers(group);
  }

  async getExpenses(
    username: string,
  ): Promise<{ id: number; date: string; balance: string; name?: string; group: string }[]> {
    const expenses = await this.databaseService.getExpenses(username);
    console.log(expenses);

    const expensesWithBalance = expenses.map(expense => {
      const cost = new Fraction(expense.price).div(expense.playUsers.length);

      let balance = new Fraction(0);

      if (!expense.isFree) {
        if (expense.payBy?.username === username) {
          balance = new Fraction(expense.price);
        }

        balance = balance.sub(cost);
      }

      return {
        id: expense.id,
        date: expense.createdAt.toISOString(),
        balance: balance.toString(),
        name: expense.expenseName,
        group: expense.group.username || expense.group.id,
      };
    });

    return expensesWithBalance;
  }

  getBalance(expenses: { balance: string }[]): string {
    const balance = expenses.reduce((acc, expense) => {
      return new Fraction(acc).add(expense.balance).toString();
    }, '0');

    return balance;
  }

  async getGroupsNames(): Promise<string[]> {
    return await this.databaseService.getGroupsNames();
  }
}
