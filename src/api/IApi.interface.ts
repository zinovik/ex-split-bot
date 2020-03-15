export interface IApi {
  getUsers(group: string): Promise<{ firstName?: string; username?: string; lastName?: string; balance: string }[]>;

  getExpenses(username: string): Promise<{ id: string; date: string; balance: string; payBy: string }[]>;

  getGroupsNames(): Promise<string[]>;
}
