import { LeakageCause } from '../types';
import Taint from './Taint';

/**
 * Base class for all leakage sources.
 *
 * Only overlap and preprocessing leakages have sources. Leakage sources are referred to as taints within the leakage
 * detector program.
 */
export default abstract class LeakageSource {
  protected taints: Taint[] = [];
  protected cause: LeakageCause = LeakageCause.Unknown;

  constructor(taint: Taint[]) {
    this.taints = taint;
  }

  getTaints(): Taint[] {
    return this.taints;
  }

  abstract getCause(): LeakageCause;
}
