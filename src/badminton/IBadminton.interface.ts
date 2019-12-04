export interface IBadminton {
  processMessage(message: string): Promise<boolean>;
}
