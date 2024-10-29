import { LeakageCause } from '../types';
import LeakageSource from './LeakageSource';
import Taint from './Taint';

export default class OverlapLeakageSource extends LeakageSource {
  constructor(taints: Taint[]) {
    super(taints);

    this.cause = this.getCause();
  }

  getCause(): LeakageCause {
    const sourceFunctions = this.taints.map((source) =>
      source.getSourceFunction().toLowerCase(),
    );

    if (sourceFunctions.some((e) => e.includes('vector'))) {
      return LeakageCause.VectorizingTextData;
    }
    if (
      sourceFunctions.every((e) => e.includes('split')) ||
      sourceFunctions.every((e) => e.includes('sample'))
    ) {
      return LeakageCause.SplitBeforeSample;
    }
    if (sourceFunctions.every((e) => e.includes('flow'))) {
      return LeakageCause.DataAugmentation;
    }
    return LeakageCause.UnknownOverlap;
  }
}
