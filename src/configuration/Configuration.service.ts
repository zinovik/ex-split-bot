import { IConfigurationService } from './IConfigurationService.interface';

export class ConfigurationService implements IConfigurationService {
  constructor(private readonly channelId: number) {
    this.channelId = channelId;
  }

  getConfiguration(): { channelId: number } {
    return { channelId: this.channelId };
  }
}
