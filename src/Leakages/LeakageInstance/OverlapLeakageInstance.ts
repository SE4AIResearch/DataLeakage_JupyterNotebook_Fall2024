import LeakageInstance from './LeakageInstance';
import {
  Leakage,
  OverlapLeakageTestingInfo,
  OverlapLeakageTrainingInfo,
} from '../types';

/**
 * Class containing all the relevant info about an overlap leakage.
 */
export default class OverlapLeakageInstance extends LeakageInstance {
  private trainingInfo: OverlapLeakageTrainingInfo;
  private testingInfo: OverlapLeakageTestingInfo;

  constructor(
    trainingInfo: OverlapLeakageTrainingInfo,
    testingInfo: OverlapLeakageTestingInfo,
  ) {
    super();

    this.trainingInfo = trainingInfo;
    this.testingInfo = testingInfo;
  }

  getLeakageType(): Leakage {
    return Leakage.OverlapLeakage;
  }

  getTrainingInfo(): OverlapLeakageTrainingInfo {
    return this.trainingInfo;
  }

  getTestingInfo(): OverlapLeakageTestingInfo {
    return this.testingInfo;
  }
}
