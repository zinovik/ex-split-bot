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

  async getExpenses(username: string): Promise<{ id: string; date: string; balance: string; payBy: string }[]> {
    const expenses = await this.databaseService.getExpenses(username);
    console.log(expenses);

    // return (expenses as any) as { id: string; date: string; balance: string; payBy: string }[];
    return [];
  }

  async getGroupsNames(): Promise<string[]> {
    return await this.databaseService.getGroupsNames();
  }
}
