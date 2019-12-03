export interface IMessageService {
  getGameInvitation(username: string): Promise<string>;
}
