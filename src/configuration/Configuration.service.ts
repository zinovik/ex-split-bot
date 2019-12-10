import { IConfigurationService } from './IConfigurationService.interface';

export class ConfigurationService implements IConfigurationService {
  constructor(
    private readonly chatUsername: string,
    private readonly gameCost: number,
    private readonly adminIds: number[],
  ) {
    this.chatUsername = chatUsername;
    this.gameCost = gameCost;
    this.adminIds = adminIds;
  }

  getConfiguration(): { chatUsername: string; gameCost: number; adminIds: number[] } {
    return { chatUsername: this.chatUsername, gameCost: this.gameCost, adminIds: this.adminIds };
  }
}
