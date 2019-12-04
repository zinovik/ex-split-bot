export interface IMessageService {
  getGameInvitation(parameters: {
    gameNumber: number;
    creator: string;
    playUsers: string[];
    skipUsers: string[];
    payUsers: string[];
  }): Promise<string>;
}
