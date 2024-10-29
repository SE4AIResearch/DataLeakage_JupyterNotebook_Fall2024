import LeakageInstance from './LeakageInstance';
import { LeakageType, type Metadata } from '../types';
import OverlapLeakageSource from '../LeakageSource/OverlapLeakageSource';

/**
 * Class containing all the relevant info about an overlap leakage.
 */
export default class OverlapLeakageInstance extends LeakageInstance {
  private metadata: {
    training: Metadata;
    testing: Metadata;
  } = { training: {}, testing: {} };
  private source: OverlapLeakageSource;

  constructor(
    trainingData: Metadata,
    testingData: Metadata,
    source: OverlapLeakageSource,
  ) {
    super();

    this.metadata['training'] = trainingData;
    this.metadata['testing'] = testingData;
    this.source = source;
  }

  getLeakageType(): LeakageType {
    return LeakageType.OverlapLeakage;
  }

  getSource(): OverlapLeakageSource {
    return this.source;
  }
}
