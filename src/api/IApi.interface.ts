export interface IApi {
  getUsers(group: string): Promise<{ firstName?: string; username?: string; lastName?: string; balance: string }[]>;

  getExpenses(username: string): Promise<{ id: number; date: string; balance: string; name?: string; group: string }[]>;
  getBalance(expenses: { balance: string }[]): string;

  getGroupsNames(): Promise<string[]>;
}
