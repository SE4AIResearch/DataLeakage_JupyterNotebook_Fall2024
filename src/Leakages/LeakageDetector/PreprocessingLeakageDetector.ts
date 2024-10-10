import PreprocessingLeakageInstance from '../LeakageInstance/PreprocessingLeakageInstance';
import LeakageDetector from './LeakageDetector';

export default class PreprocessingLeakageDetector extends LeakageDetector<PreprocessingLeakageInstance> {
  getLeakageInstances(): Promise<PreprocessingLeakageInstance[]> {
    throw new Error('Method not implemented.');
  }
}
