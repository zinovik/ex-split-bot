import { IApi } from './IApi.interface';
import { IDatabaseService } from '../database/IDatabaseService.interface';

export class Api implements IApi {
  constructor(private readonly databaseService: IDatabaseService) {
    this.databaseService = databaseService;
  }

  async getUsers(
    chatUsername: string,
  ): Promise<{ firstName?: string; username?: string; lastName?: string; balance: string }[]> {
    return await this.databaseService.getUsers(chatUsername);
  }

  async getGroupsNames(): Promise<string[]> {
    return await this.databaseService.getGroupsNames();
  }
}
