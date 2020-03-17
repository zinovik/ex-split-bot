export interface IApi {
  getUsers(
    group: string,
  ): Promise<{ firstName?: string; username?: string; lastName?: string; balance: string; id: number }[]>;

  getExpenses(
    id: number,
  ): Promise<{
    username: string;
    balance: string;
    groups: {
      name: string;
      balance: string;
      expenses: { id: number; date: string; balance: string; name?: string }[];
    }[];
  }>;

  getGroupsNames(): Promise<string[]>;
}
