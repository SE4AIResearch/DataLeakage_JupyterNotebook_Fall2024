import { Leakage } from '../types';

/**
 * Base class for all leakage instances.
 *
 * A leakage instance is basically just an object containing all the relevant info about a leakage.
 */
export default abstract class LeakageInstance {
  abstract getLeakageType(): Leakage;
}
