import LeakageInstance from './LeakageInstance';
import PreprocessingLeakageSource from '../LeakageSource/PreprocessingLeakageSource';
import { LeakageType, type TrainTestSite, type Metadata } from '../types';

/**
 * Class containing all the relevant info about a preprocessing leakage.
 */
export default class PreprocessingLeakageInstance extends LeakageInstance {
  private line: number;
  private occurrences: TrainTestSite[];
  private source: PreprocessingLeakageSource;

  constructor(
    line: number,
    occurrences: TrainTestSite[],
    source: PreprocessingLeakageSource,
  ) {
    super();

    this.line = line;
    this.occurrences = occurrences;
    this.source = source;
  }

  getLeakageType(): LeakageType {
    return LeakageType.PreprocessingLeakage;
  }

  getLine(): number {
    return this.line;
  }

  getOccurrences(): TrainTestSite[] {
    return this.occurrences;
  }

  getSource(): PreprocessingLeakageSource {
    return this.source;
  }
}
