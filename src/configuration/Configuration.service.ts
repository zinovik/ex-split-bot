import { IConfigurationService } from './IConfigurationService.interface';

export class ConfigurationService implements IConfigurationService {
  constructor(private readonly gameCost: number) {
    this.gameCost = gameCost;
  }

  getConfiguration(): { gameCost: number } {
    return { gameCost: this.gameCost };
  }
}
