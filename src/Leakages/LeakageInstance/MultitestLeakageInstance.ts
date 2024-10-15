import LeakageInstance from './LeakageInstance';
import { Leakage, MultitestLeakageOccurrenceInfo } from '../types';

export default class MultitestLeakageInstance extends LeakageInstance {
  private testedVariable: string;
  private occurrences: MultitestLeakageOccurrenceInfo[];

  constructor(variable: string, occurrences: MultitestLeakageOccurrenceInfo[]) {
    super();

    this.testedVariable = variable;
    this.occurrences = occurrences;
  }

  getLeakageType(): Leakage {
    return Leakage.MultitestLeakage;
  }

  getTestedVariable(): string {
    return this.testedVariable;
  }

  getOccurrences(): MultitestLeakageOccurrenceInfo[] {
    return this.occurrences;
  }
}
