import { LeakageType } from '../../../data/Leakages/types';

import { LeakageAdapter } from '../types/types';

export const convertTypeToReadableString = (
  type: LeakageType,
): LeakageAdapter['displayType'] => {
  switch (type) {
    case LeakageType.PreProcessingLeakage:
      return 'Pre-Processing Leakage';
    case LeakageType.OverlapLeakage:
      return 'Overlap Leakage';
    default:
      return 'Multi-Test Leakage';
  }
};
