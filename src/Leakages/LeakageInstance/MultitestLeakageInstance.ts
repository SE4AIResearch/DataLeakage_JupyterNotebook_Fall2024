import LeakageInstance from './LeakageInstance';
import { Leakage, MultitestLeakageOccurrenceInfo } from '../types';

export default class MultitestLeakageInstance extends LeakageInstance {
  private variable: string;
  private occurrences: MultitestLeakageOccurrenceInfo[];

  constructor(variable: string, occurrences: MultitestLeakageOccurrenceInfo[]) {
    super();

    this.variable = variable;
    this.occurrences = occurrences;
  }

  getLeakageType(): Leakage {
    return Leakage.MultitestLeakage;
  }
}
