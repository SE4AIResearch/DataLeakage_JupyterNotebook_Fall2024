/**
 * Types
 */

import { LeakageType } from '../../../data/Leakages/types';

export type LeakageAdapter = {
  id: number;
  gid: number;
  type: LeakageType;
  cause: string;
  line: number;
  model: string;
  variable: string;
  method: string;

  displayId: number;
  displayGid: number;
  displayType:
    | 'Overlap Leakage'
    | 'Pre-Processing Leakage'
    | 'Multi-Test Leakage';
  displayCause: string;
  displayLine: number;
  displayModel: string;
  displayVariable: string;
  displayMethod: string;
};

export type LeakageAdapterCell = {
  id: number;
  gid: number;
  type: LeakageType;
  cause: string;
  line: number;
  cell: number;
  model: string;
  variable: string;
  method: string;

  displayId: number;
  displayGid: number;
  displayType:
    | 'Overlap Leakage'
    | 'Pre-Processing Leakage'
    | 'Multi-Test Leakage';
  displayCause: string;
  displayLine: number;
  displayCell: number;
  displayModel: string;
  displayVariable: string;
  displayMethod: string;
};

export type Groups = Array<Set<string>>;

export type Equivalences = Record<string, number>; // { varName: groupIndex }

export type VarEquals = { groups: Groups; equivalences: Equivalences };
