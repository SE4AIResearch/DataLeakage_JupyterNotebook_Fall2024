import Invocation from './parser/Invocation';

export enum LeakageTypes {
  Overlap = 'overlap',
  Multitest = 'multitest',
  Preprocessing = 'preprocessing',
}

export enum TaintTypes {
  Dup = 'dup',
  Rowset = 'rowset',
  Unknown = 'unknown',
}

export type OverlapLeakageInfo = {
  columnZero: string;
  invocation: Invocation;
  internalLine: number;
  actualLine: number;
  columnFour: string;
}[];
