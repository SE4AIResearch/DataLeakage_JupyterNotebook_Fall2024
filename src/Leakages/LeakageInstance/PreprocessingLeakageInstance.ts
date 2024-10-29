import LeakageInstance from './LeakageInstance';
import PreprocessingLeakageSource from '../LeakageSource/PreprocessingLeakageSource';
import { LeakageType, type Metadata } from '../types';

/**
 * Class containing all the relevant info about a preprocessing leakage.
 */
export default class PreprocessingLeakageInstance extends LeakageInstance {
  private metadata: {
    training: Metadata;
    testing: Metadata;
  } = { training: {}, testing: {} };
  private source: PreprocessingLeakageSource;

  constructor(
    trainingData: Metadata,
    testingData: Metadata,
    source: PreprocessingLeakageSource,
  ) {
    super();

    this.metadata['training'] = trainingData;
    this.metadata['testing'] = testingData;
    this.source = source;
  }

  getLeakageType(): LeakageType {
    return LeakageType.PreprocessingLeakage;
  }

  getSource(): PreprocessingLeakageSource {
    return this.source;
  }
}
