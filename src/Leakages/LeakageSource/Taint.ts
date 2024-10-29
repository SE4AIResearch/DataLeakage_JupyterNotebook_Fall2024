import { TaintType } from '../types';

export default class Taint {
  private type: TaintType;
  private destinationVariable: string;
  private sourceVariable: string;
  private sourceFunction: string;
  private line: number;

  constructor(
    type: TaintType,
    destinationVariable: string,
    sourceVariable: string,
    sourceFunction: string,
    line: number,
  ) {
    this.type = type;
    this.destinationVariable = destinationVariable;
    this.sourceVariable = sourceVariable;
    this.sourceFunction = sourceFunction;
    this.line = line;
  }

  getType(): TaintType {
    return this.type;
  }

  getDestinationVariable(): string {
    return this.destinationVariable;
  }

  getSourceVariable(): string {
    return this.sourceVariable;
  }

  getSourceFunction(): string {
    return this.sourceFunction;
  }

  getLine(): number {
    return this.line;
  }
}
