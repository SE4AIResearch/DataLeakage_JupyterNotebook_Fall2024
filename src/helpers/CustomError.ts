export class NotAnalyzedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotAnalyzedError';
  }
}
