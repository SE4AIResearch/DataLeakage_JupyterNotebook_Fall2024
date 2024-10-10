import { LeakageType } from '../types';
import Invocation from './Invocation';
import LeakageInstance from './LeakageInstance';

export default class PreprocessingLeakageInstance extends LeakageInstance {
  getLeakageType(): LeakageType {
    throw new Error('Method not implemented.');
  }
  getTrainingInvocation(): Invocation {
    throw new Error('Method not implemented.');
  }
  getTrainingVariable(): string {
    throw new Error('Method not implemented.');
  }
  getTestingInvocation(): Invocation {
    throw new Error('Method not implemented.');
  }
  getTestingVariable(): string {
    throw new Error('Method not implemented.');
  }
}
