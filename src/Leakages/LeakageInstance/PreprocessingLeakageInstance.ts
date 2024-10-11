import LeakageInstance from './LeakageInstance';
import {
  Leakage,
  PreprocessingLeakageTestingInfo,
  PreprocessingLeakageTrainingInfo,
} from '../types';

/**
 * Class containing all the relevant info about a preprocessing leakage.
 */
export default class PreprocessingLeakageInstance extends LeakageInstance {
  private trainingInfo: PreprocessingLeakageTrainingInfo;
  private testingInfo: PreprocessingLeakageTestingInfo;

  constructor(
    trainingInfo: PreprocessingLeakageTrainingInfo,
    testingInfo: PreprocessingLeakageTestingInfo,
  ) {
    super();

    this.trainingInfo = trainingInfo;
    this.testingInfo = testingInfo;
  }

  getLeakageType(): Leakage {
    return Leakage.PreprocessingLeakage;
  }

  getTrainingInfo(): PreprocessingLeakageTrainingInfo {
    return this.trainingInfo;
  }

  getTestingInfo(): PreprocessingLeakageTestingInfo {
    return this.testingInfo;
  }
}
