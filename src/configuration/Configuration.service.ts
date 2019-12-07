import { IConfigurationService } from './IConfigurationService.interface';

export class ConfigurationService implements IConfigurationService {
  constructor(private readonly groupIds: number[], private readonly gameCost: number) {
    this.groupIds = groupIds;
    this.gameCost = gameCost;
  }

  getConfiguration(): { groupIds: number[]; gameCost: number } {
    return { groupIds: this.groupIds, gameCost: this.gameCost };
  }
}
