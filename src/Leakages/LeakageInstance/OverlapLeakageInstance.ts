import Invocation from './Invocation';
import LeakageInstance from './LeakageInstance';
import { LeakageType } from '../types';

export default class OverlapLeakageInstance extends LeakageInstance {
  private trainingInvocation: Invocation;
  private trainingVariable: string;
  private testingInvocation: Invocation;
  private testingVariable: string;

  constructor(
    trainingInvocation: Invocation,
    trainingVariable: string,
    testingInvocation: Invocation,
    testingVariable: string,
  ) {
    super();

    this.trainingInvocation = trainingInvocation;
    this.trainingVariable = trainingVariable;
    this.testingInvocation = testingInvocation;
    this.testingVariable = testingVariable;
  }

  getLeakageType(): LeakageType {
    return LeakageType.OverlapLeakage;
  }

  getTrainingInvocation(): Invocation {
    return this.trainingInvocation;
  }

  getTrainingVariable(): string {
    return this.trainingVariable;
  }

  getTestingInvocation(): Invocation {
    return this.testingInvocation;
  }

  getTestingVariable(): string {
    return this.testingVariable;
  }
}
