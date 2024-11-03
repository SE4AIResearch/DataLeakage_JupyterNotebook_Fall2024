import LeakageInstance from './LeakageInstance';
import { LeakageType, type MultitestLeakageOccurrence } from '../types';

export default class MultitestLeakageInstance extends LeakageInstance {
  private occurrences: MultitestLeakageOccurrence[];

  constructor(occurrences: MultitestLeakageOccurrence[]) {
    super();

    this.occurrences = occurrences;
  }

  getLeakageType(): LeakageType {
    return LeakageType.MultitestLeakage;
  }

  getOccurrences(): MultitestLeakageOccurrence[] {
    return this.occurrences;
  }
}
