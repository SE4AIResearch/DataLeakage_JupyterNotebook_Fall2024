export enum LeakageType {
  OverlapLeakage,
  PreprocessingLeakage,
  MultitestLeakage,
}

export enum TaintType {
  Dup = 'dup',
  Rowset = 'rowset',
  Unknown = 'unknown',
}

export enum LeakageCause {
  SplitBeforeSample = 'splitBeforeSample',
  DataAugmentation = 'dataAugmentation',
  VectorizingTextData = 'vectorizingTextData',
  RepeatDataEvaluation = 'repeatDataEvaluation',
  UnknownOverlap = 'unknownOverlap',
  UnknownPreprocessing = 'unknownPreprocessing',
  Unknown = 'unknown',
}

export type InternalLineMappings = Record<number, number>;

export type InvocationLineMappings = Record<string, number>;

export type Metadata = Record<string, unknown>;

export type InvocationMetadataMappings = Record<string, Metadata>;

export type InvocationTrainTestMappings = Record<string, Set<string>>;

export type TrainTestSite = {
  trainingData: Metadata;
  testingData: Metadata[];
};
