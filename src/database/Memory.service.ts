import { IDatabaseService } from './IDatabaseService.interface';

const storage: { [key: string]: any } = {};

export class MemoryService implements IDatabaseService {
  async get(key: string): Promise<any> {
    return Promise.resolve(storage[key]);
  }

  async set(key: string, value: any): Promise<void> {
    storage[key] = value;
    return Promise.resolve();
  }
}
