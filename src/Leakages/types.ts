export enum Leakage {
  OverlapLeakage,
  PreprocessingLeakage,
  MultitestLeakage,
}

export enum Taint {
  Dup = 'dup',
  Rowset = 'rowset',
  Unknown = 'unknown',
}

export type InternalLineMappings = Record<number, number>;
export type InvocationLineMappings = Record<string, number>;
export type InvocationFunctionMappings = Record<string, string>;

export type LeakageSourceInfo = {
  leakageSource: string;
  leakageSourceFunction: string;
  leakageSourceLine: number;
  leakageSourceType: Taint;
  leakageDestination: string;
};

export type OverlapLeakageTrainingInfo = {
  model: string;
  variable: string;
  trainingFunction: string;
  line: number;
};

export type OverlapLeakageTestingInfo = {
  model: string;
  variable: string;
  testingFunction: string;
  line: number;
};

export type PreprocessingLeakageTrainingInfo = {
  model: string;
  variable: string;
  trainingFunction: string;
  line: number;
};

export type PreprocessingLeakageTestingInfo = {
  model: string;
  variable: string;
  testingFunction: string;
  line: number;
};

export type MultitestLeakageOccurrenceInfo = {
  model: string;
  testingFunction: string;
  line: number;
};
