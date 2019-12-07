export interface IConfigurationService {
  getConfiguration(): { groupIds: number[]; gameCost: number };
}
