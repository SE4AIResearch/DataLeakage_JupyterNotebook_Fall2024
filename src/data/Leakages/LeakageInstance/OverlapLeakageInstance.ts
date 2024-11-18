import LeakageInstance from './LeakageInstance';
import { LeakageType, type TrainTestSite, type Metadata } from '../types';
import OverlapLeakageSource from '../LeakageSource/OverlapLeakageSource';

/**
 * Class containing all the relevant info about an overlap leakage.
 */
export default class OverlapLeakageInstance extends LeakageInstance {
  private line: number;
  private occurrences: TrainTestSite[];
  private source: OverlapLeakageSource;

  constructor(
    line: number,
    occurrences: TrainTestSite[],
    source: OverlapLeakageSource,
  ) {
    super();

    this.line = line;
    this.occurrences = occurrences;
    this.source = source;
  }

  getLeakageType(): LeakageType {
    return LeakageType.OverlapLeakage;
  }

  getLine(): number {
    return this.line;
  }

  getOccurrences(): TrainTestSite[] {
    return this.occurrences;
  }

  getSource(): OverlapLeakageSource {
    return this.source;
  }
}
