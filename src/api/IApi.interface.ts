export interface IApi {
  getUsers(
    group: string,
  ): Promise<{ firstName?: string; username?: string; lastName?: string; balance: string; id: number }[]>;

  getExpenses(id: number): Promise<{ id: number; date: string; balance: string; name?: string; group: string }[]>;
  getBalance(expenses: { balance: string }[]): string;

  getGroupsNames(): Promise<string[]>;
}
