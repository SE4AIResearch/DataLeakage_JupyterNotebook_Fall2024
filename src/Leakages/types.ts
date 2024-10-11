export enum Leakage {
  OverlapLeakage,
  PreprocessingLeakage,
  MultitestLeakage,
}

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
