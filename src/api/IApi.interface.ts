import { User } from '../database/entities/User.entity';

export interface IApi {
  getUsers(): Promise<User[]>;
}
