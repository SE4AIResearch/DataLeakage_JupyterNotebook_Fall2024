import LeakageInstance from './LeakageInstance';
import { LeakageType, type TrainTestSite } from '../types';

export default class MultitestLeakageInstance extends LeakageInstance {
  private lines: number[];
  private occurrences: {
    trainTest: TrainTestSite;
    otherUsageLines: number[];
  }[];

  constructor(
    lines: number[],
    occurrences: {
      trainTest: TrainTestSite;
      otherUsageLines: number[];
    }[],
  ) {
    super();

    this.lines = lines;
    this.occurrences = occurrences;
  }

  getLeakageType(): LeakageType {
    return LeakageType.MultitestLeakage;
  }

  getLines(): number[] {
    return this.lines;
  }

  getOccurrences(): {
    trainTest: TrainTestSite;
    otherUsageLines: number[];
  }[] {
    return this.occurrences;
  }
}
