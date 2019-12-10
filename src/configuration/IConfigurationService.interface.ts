export interface IConfigurationService {
  getConfiguration(): { chatUsername: string; gameCost: number; adminIds: number[] };
}
