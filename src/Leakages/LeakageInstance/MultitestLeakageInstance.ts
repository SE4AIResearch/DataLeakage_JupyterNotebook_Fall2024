import LeakageInstance from './LeakageInstance';
import { LeakageType, type Metadata } from '../types';

export default class MultitestLeakageInstance extends LeakageInstance {
  private occurrences: Metadata[];

  constructor(occurrences: Metadata[]) {
    super();

    this.occurrences = occurrences;
  }

  getLeakageType(): LeakageType {
    return LeakageType.MultitestLeakage;
  }

  getOccurrences(): Metadata[] {
    return this.occurrences;
  }
}
