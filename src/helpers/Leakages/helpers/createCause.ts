import { LeakageType } from '../../../data/Leakages/types';

export const createCause = (type: LeakageType): string => {
  switch (type) {
    case LeakageType.PreProcessingLeakage:
      return 'Vectorizer fit on train and test data together';
    case LeakageType.OverlapLeakage:
      return 'Same/Similar data in both train and test';
    default:
      return 'Repeat data evaluation';
  }
};
