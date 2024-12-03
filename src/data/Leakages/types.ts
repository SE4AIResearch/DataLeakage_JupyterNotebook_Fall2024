export enum LeakageType {
  OverlapLeakage = 'OverlapLeakage',
  PreProcessingLeakage = 'PreProcessingLeakage',
  MultiTestLeakage = 'MultiTestLeakage',
}

export type LeakageOutput = {
  leakageInstances: Record<LeakageType, number[]>;
  leakageLines: Record<number, LineTag[]>;
};

export type LineTag = {
  name: string;
  isButton: boolean;
  highlightLines?: number[];
  markLeakSources?: number[];
};
