import LeakageInstance from './LeakageInstance';
import PreprocessingLeakageSource from '../LeakageSource/PreprocessingLeakageSource';
import { LeakageType, type Metadata } from '../types';

/**
 * Class containing all the relevant info about a preprocessing leakage.
 */
export default class PreprocessingLeakageInstance extends LeakageInstance {
  private trainingData: Metadata;
  private testingData: Metadata;
  private source: PreprocessingLeakageSource;

  constructor(
    trainingData: Metadata,
    testingData: Metadata,
    source: PreprocessingLeakageSource,
  ) {
    super();

    this.trainingData = trainingData;
    this.testingData = testingData;
    this.source = source;
  }

  getLeakageType(): LeakageType {
    return LeakageType.PreprocessingLeakage;
  }

  getTrainingData(): Metadata {
    return this.trainingData;
  }

  getTestingData(): Metadata {
    return this.testingData;
  }

  getSource(): PreprocessingLeakageSource {
    return this.source;
  }
}
