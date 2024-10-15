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
  private sourceVariable: string; // TODO - Not 100% on this
  private trainingInfo: PreprocessingLeakageTrainingInfo;
  private testingInfo: PreprocessingLeakageTestingInfo;

  constructor(
    sourceVariable: string,
    trainingInfo: PreprocessingLeakageTrainingInfo,
    testingInfo: PreprocessingLeakageTestingInfo,
  ) {
    super();

    this.sourceVariable = sourceVariable;
    this.trainingInfo = trainingInfo;
    this.testingInfo = testingInfo;
  }

  getLeakageType(): Leakage {
    return Leakage.PreprocessingLeakage;
  }

  getSourceVariable(): string {
    return this.sourceVariable;
  }

  getTrainingInfo(): PreprocessingLeakageTrainingInfo {
    return this.trainingInfo;
  }

  getTestingInfo(): PreprocessingLeakageTestingInfo {
    return this.testingInfo;
  }
}
