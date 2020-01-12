import { IApi } from './IApi.interface';
import { IDatabaseService } from '../database/IDatabaseService.interface';

import { User } from '../database/entities/User.entity';

export class Api implements IApi {
  constructor(private readonly databaseService: IDatabaseService) {
    this.databaseService = databaseService;
  }

  async getUsers(chatUsername: string): Promise<User[]> {
    return await this.databaseService.getUsers(chatUsername);
  }
}
