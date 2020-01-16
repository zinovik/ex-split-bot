import { IConfigurationService } from './IConfigurationService.interface';

export class ConfigurationService implements IConfigurationService {
  constructor(private readonly defaultPrice: number) {
    this.defaultPrice = defaultPrice;
  }

  getConfiguration(): { defaultPrice: number } {
    return { defaultPrice: this.defaultPrice };
  }
}
