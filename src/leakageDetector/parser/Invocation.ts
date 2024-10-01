export default class Invocation extends Object {
  static REGEX = /invo([0-9]+)/;

  private number: number;

  constructor(invocationString: string) {
    super();
    this.number = this.getInvocationNumberFromString(invocationString);
  }

  getNumber(): number {
    return this.number;
  }

  /**
   * Matches the given string against the RegExp /invo([0-9]+)/ in order to extract
   * the invocation number.
   *
   * @param invocationString The string to be matched.
   * @returns The extracted invocation number.
   */
  private getInvocationNumberFromString(invocationString: string): number {
    const match = invocationString.match(Invocation.REGEX);
    if (match) {
      return parseInt(match[1]);
    } else {
      throw new Error('Invalid invocation string.');
    }
  }

  override toString() {
    return this.number.toString();
  }
}
