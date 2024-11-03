import LeakageInstance from './LeakageInstance';
import { LeakageType, type Metadata } from '../types';
import OverlapLeakageSource from '../LeakageSource/OverlapLeakageSource';

/**
 * Class containing all the relevant info about an overlap leakage.
 */
export default class OverlapLeakageInstance extends LeakageInstance {
  private trainingData: Metadata;
  private testingData: Metadata;
  private source: OverlapLeakageSource;

  constructor(
    trainingData: Metadata,
    testingData: Metadata,
    source: OverlapLeakageSource,
  ) {
    super();

    this.trainingData = trainingData;
    this.testingData = testingData;
    this.source = source;
  }

  getLeakageType(): LeakageType {
    return LeakageType.OverlapLeakage;
  }

  getTrainingData(): Metadata {
    return this.trainingData;
  }

  getTestingData(): Metadata {
    return this.testingData;
  }

  getSource(): OverlapLeakageSource {
    return this.source;
  }
}
