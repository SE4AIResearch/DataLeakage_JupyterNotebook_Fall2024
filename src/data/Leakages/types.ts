export enum LeakageType {
  OverlapLeakage = 'OverlapLeakage',
  PreProcessingLeakage = 'PreProcessingLeakage',
  MultiTestLeakage = 'MultiTestLeakage',
}

export type LeakageOutput = {
  leakageInstances: LeakageInstances;
  leakageLines: LeakageLines;
};

export type LeakageInstances = Record<LeakageType, number[]>;

export type LeakageLines = Record<
  number,
  {
    metadata: Metadata;
    tags: LineTag[];
  }
>;

export type Metadata = {
  model: string;
  variable: string;
  method: string;
};

export type LineTag = {
  name: string;
  isButton: boolean;
  highlightLines?: number[];
  markLeakSources?: number[];
};
