import { IConfigurationService } from './IConfigurationService.interface';

export class ConfigurationService implements IConfigurationService {
  constructor(private readonly chatUsername: string, private readonly gameCost: number) {
    this.chatUsername = chatUsername;
    this.gameCost = gameCost;
  }

  getConfiguration(): { chatUsername: string; gameCost: number } {
    return { chatUsername: this.chatUsername, gameCost: this.gameCost };
  }
}
