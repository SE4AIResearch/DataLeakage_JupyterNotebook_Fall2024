import Invocation from './Invocation';
import { LeakageType } from '../types';

export default abstract class LeakageInstance {
  abstract getLeakageType(): LeakageType;

  abstract getTrainingInvocation(): Invocation;

  abstract getTrainingVariable(): string;

  abstract getTestingInvocation(): Invocation;

  abstract getTestingVariable(): string;
}
