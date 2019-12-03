export interface IDatabaseService {
  getUserBalance(username: string): Promise<number>;
  setUserBalance(username: string, balance: number): Promise<void>;
}
