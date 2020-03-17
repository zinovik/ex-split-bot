import Fraction from 'fraction.js';

import { IApi } from './IApi.interface';
import { IDatabaseService } from '../database/IDatabaseService.interface';

export class Api implements IApi {
  constructor(private readonly databaseService: IDatabaseService) {
    this.databaseService = databaseService;
  }

  async getUsers(
    group: string,
  ): Promise<{ firstName?: string; username?: string; lastName?: string; balance: string; id: number }[]> {
    return await this.databaseService.getUsers(group);
  }

  async getExpenses(
    id: number,
  ): Promise<{
    username: string;
    balance: string;
    groups: {
      name: string;
      balance: string;
      expenses: { id: number; date: string; balance: string; name?: string }[];
    }[];
  }> {
    const expenses = await this.databaseService.getExpenses(id);

    const expensesFormatted = {
      username: await this.databaseService.getUsername(id),
      balance: '0',
      groups: [],
    } as {
      username: string;
      balance: string;
      groups: {
        name: string;
        balance: string;
        expenses: { id: number; date: string; balance: string; name?: string }[];
      }[];
    };

    expenses.forEach(expense => {
      const groupName = expense.group.username || expense.group.id;

      const isGroupFound = expensesFormatted.groups.some((g, i) => {
        if (g.name === groupName) {
          const expenseBalance = this.getExpenseBalance(expense, id);

          expensesFormatted.groups[i].expenses.push({
            id: expense.id,
            date: expense.createdAt.toISOString(),
            balance: expenseBalance.toString(),
            name: expense.expenseName,
          });

          expensesFormatted.groups[i].balance = new Fraction(expensesFormatted.groups[i].balance)
            .add(expenseBalance)
            .toString();

          expensesFormatted.balance = new Fraction(expensesFormatted.balance).add(expenseBalance).toString();

          return true;
        }

        return false;
      });

      if (!isGroupFound) {
        const expenseBalance = this.getExpenseBalance(expense, id).toString();

        expensesFormatted.groups.push({
          name: groupName,
          balance: expenseBalance,
          expenses: [
            {
              id: expense.id,
              date: expense.createdAt.toISOString(),
              balance: expenseBalance,
              name: expense.expenseName,
            },
          ],
        });

        expensesFormatted.balance = new Fraction(expensesFormatted.balance).add(expenseBalance).toString();
      }
    });

    return expensesFormatted;
  }

  private getExpenseBalance(
    expense: {
      price: number;
      playUsers: {}[];
      isFree: boolean;
      payBy: { id: number } | null;
    },
    id: number,
  ): Fraction {
    const cost = new Fraction(expense.price).div(expense.playUsers.length);

    let balance = new Fraction(0);

    if (!expense.isFree) {
      if (expense.payBy && expense.payBy.id === id) {
        balance = new Fraction(expense.price);
      }

      balance = balance.sub(cost);
    }

    return balance;
  }

  async getGroupsNames(): Promise<string[]> {
    return await this.databaseService.getGroupsNames();
  }
}
