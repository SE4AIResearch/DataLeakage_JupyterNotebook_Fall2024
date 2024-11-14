import LeakageInstance from '../Leakages/LeakageInstance/LeakageInstance';
import MultitestLeakageInstance from '../Leakages/LeakageInstance/MultitestLeakageInstance';
import OverlapLeakageInstance from '../Leakages/LeakageInstance/OverlapLeakageInstance';
import PreprocessingLeakageInstance from '../Leakages/LeakageInstance/PreprocessingLeakageInstance';

export type LeakageAdapter = {
  type: string;
  line: number;
  variable: string;
  cause: string;
  parent: null | Array<LeakageAdapter>; // not sure what to do with this but it is an array of testingData that are related to each other (array includes the object itself)
};

export type LeakageAdapterCell = {
  type: string;
  line: number;
  cell: number;
  variable: string;
  cause: string;
  parent: null | Array<LeakageAdapter>; // not sure what to do with this but it is an array of testingData that are related to each other (array includes the object itself)
};

const adaptOverlapLeakageInstance = (
  leakage: OverlapLeakageInstance,
): LeakageAdapter => {
  const cause = leakage.getSource().getCause().toString();
  const testData = leakage.getTestingData();

  const testAdapter = {
    type: 'Overlap',
    line: typeof testData.line === 'number' ? testData.line : -1,
    variable: typeof testData.variable === 'string' ? testData.variable : '',
    cause,
    parent: null,
  };

  return testAdapter;
};

const adaptPreprocessingLeakageInstance = (
  leakage: PreprocessingLeakageInstance,
): LeakageAdapter => {
  const cause = leakage.getSource().getCause().toString();
  const testData = leakage.getTestingData();
  const trainingData = leakage.getTrainingData();

  const testAdapter = {
    type: 'Preprocessing',
    line: typeof testData.line === 'number' ? testData.line : -1,
    variable: typeof testData.variable === 'string' ? testData.variable : '',
    cause,
    parent: null,
  };

  return testAdapter;
};

const adaptMultitestLeakageInstances = (
  leakage: MultitestLeakageInstance,
): LeakageAdapter[] => {
  const leakageAdapters = leakage
    .getOccurrences()
    .map((o) => o.testingData)
    .map((metadataArray) =>
      metadataArray
        .map((metadata) => ({
          type: 'Multi-Test',
          line: typeof metadata.line === 'number' ? metadata.line : -1,
          variable:
            typeof metadata.variable === 'string' ? metadata.variable : '',
          cause: 'repeatDataEvaluation',
          parent: null,
        }))
        .map((leakageAdapter, _, arr) => ({ ...leakageAdapter, parent: arr })),
    )
    .flat();

  return leakageAdapters;
};

export function createLeakageAdapters(
  leakages: LeakageInstance[],
): LeakageAdapter[] {
  const leakageAdapters: LeakageAdapter[] = [];

  leakages.forEach((leakage) => {
    if (leakage instanceof OverlapLeakageInstance) {
      leakageAdapters.push(adaptOverlapLeakageInstance(leakage));
    } else if (leakage instanceof PreprocessingLeakageInstance) {
      leakageAdapters.push(adaptPreprocessingLeakageInstance(leakage));
    } else if (leakage instanceof MultitestLeakageInstance) {
      leakageAdapters.push(...adaptMultitestLeakageInstances(leakage));
    } else {
      console.error('Error: Unknown Leakage Instance Type.');
    }
  });

  return leakageAdapters;
}
