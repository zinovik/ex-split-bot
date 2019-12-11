export interface IBadminton {
  processMessage(notParsedMessage: string): Promise<void>;
}
