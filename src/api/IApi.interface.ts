export interface IApi {
  getUsers(
    chatUsername: string,
  ): Promise<{ firstName?: string; username?: string; lastName?: string; balance: string }[]>;
  getGroupsNames(): Promise<string[]>;
}
