import { User } from '../database/entities/User.entity';

export interface IApi {
  getUsers(chatUsername: string): Promise<User[]>;
  getGroupsNames(): Promise<string[]>;
}
