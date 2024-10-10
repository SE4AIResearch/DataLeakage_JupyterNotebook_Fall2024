export default class Invocation {
  private string: string;
  private number: number;
  private internalLineNumber: number;
  private actualLineNumber: number;
  private func: string;

  constructor(
    invocationString: string,
    internalLineNumber: number,
    actualLineNumber: number,
    func: string,
  ) {
    this.string = invocationString;
    this.number = this.getInvocationNumber(invocationString);
    this.internalLineNumber = internalLineNumber;
    this.actualLineNumber = actualLineNumber;
    this.func = func;
  }

  getString(): string {
    return this.string;
  }

  getNumber(): number {
    return this.number;
  }

  getInternalLineNumber(): number {
    return this.internalLineNumber;
  }

  getActualLineNumber(): number {
    return this.actualLineNumber;
  }

  getFunction(): string {
    return this.func;
  }

  /**
   * Matches the given string against the RegExp /invo([0-9]+)/ in order to extract
   * the invocation number.
   *
   * @param invocationString The string to be matched.
   * @returns The extracted invocation number.
   */
  private getInvocationNumber(invocationString: string): number {
    const match = invocationString.match(/invo([0-9]+)/);
    if (match) {
      return parseInt(match[1]);
    } else {
      throw new Error('Invalid invocation string.');
    }
  }
}
