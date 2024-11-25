/**
 * Imports
 */

// Import Node Modules
import * as vscode from 'vscode';

// Import /src/data
import LeakageInstance from '../../data/Leakages/LeakageInstance/LeakageInstance';
import MultitestLeakageInstance from '../../data/Leakages/LeakageInstance/MultitestLeakageInstance';
import OverlapLeakageInstance from '../../data/Leakages/LeakageInstance/OverlapLeakageInstance';
import PreprocessingLeakageInstance from '../../data/Leakages/LeakageInstance/PreprocessingLeakageInstance';
import Leakages from '../../data/Leakages/Leakages';
import { Metadata } from '../../data/Leakages/types';

// Import /src/helpers
import { TempDir } from '../TempDir';
import {
  ConversionToJupyter,
  ConversionToPython,
  JupyCell,
} from '../conversion/LineConversion';

import fs from 'fs';
import path from 'path';

/**
 * Types
 */

export type LeakageAdapter = {
  type: 'Overlap' | 'Preprocessing' | 'Multi-Test';
  line: number;
  variable: string;
  cause: string;
  parent: null | Array<LeakageAdapter>; // not sure what to do with this but it is an array of testingData that are related to each other (array includes the object itself)
};

export type LeakageAdapterCell = {
  type: 'Overlap' | 'Preprocessing' | 'Multi-Test';
  line: number;
  cell: number;
  variable: string;
  cause: string;
  parent: null | Array<LeakageAdapter>; // not sure what to do with this but it is an array of testingData that are related to each other (array includes the object itself)
};

/**
 * Custom Error
 */
export class NotAnalyzedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotAnalyzedError';
  }
}

/**
 * Helper Functions
 */

/**
 *
 * @param metadataArrays
 * @param cause
 * @returns
 */
const leakageAdapterHelper = (
  type: 'Overlap' | 'Preprocessing' | 'Multi-Test',
  metadataArrays: Metadata[][],
  cause: string,
) =>
  metadataArrays
    .map((metadataArray) =>
      metadataArray.map(
        (metadata): LeakageAdapter => ({
          type: type,
          line: typeof metadata.line === 'number' ? metadata.line : -1,
          variable:
            typeof metadata.variable === 'string' ? metadata.variable : '',
          cause,
          parent: null,
        }),
      ),
    )
    .flat();

// FIXME: Get main line and match metaarray lines and only return those

const adaptOverlapLeakageInstance = (
  leakage: OverlapLeakageInstance,
): LeakageAdapter[] => {
  const cause = leakage.getSource().getCause().toString();
  const metadataArrays = leakage.getOccurrences().map((o) => o.testingData);
  const leakageAdapters = leakageAdapterHelper(
    'Overlap',
    metadataArrays,
    cause,
  );

  return leakageAdapters;
};

const adaptPreprocessingLeakageInstance = (
  leakage: PreprocessingLeakageInstance,
): LeakageAdapter[] => {
  const cause = leakage.getSource().getCause().toString();
  const metadataArrays = leakage.getOccurrences().map((o) => o.testingData);
  const leakageAdapters = leakageAdapterHelper(
    'Preprocessing',
    metadataArrays,
    cause,
  );

  return leakageAdapters;
};

const adaptMultitestLeakageInstances = (
  leakage: MultitestLeakageInstance,
): LeakageAdapter[] => {
  const cause = 'repeatDataEvaluation';
  const metadataArrays = leakage
    .getOccurrences()
    .map((o) => o.trainTest.testingData);
  const leakageAdapters = leakageAdapterHelper(
    'Multi-Test',
    metadataArrays,
    cause,
  );

  return leakageAdapters;
};

/**
 * Exported Functions
 */

/**
 *
 * @param leakages
 * @returns
 */
export function createLeakageAdapters(
  leakages: LeakageInstance[],
): LeakageAdapter[] {
  const leakageAdapters: LeakageAdapter[] = [];

  leakages.forEach((leakage) => {
    if (leakage instanceof OverlapLeakageInstance) {
      leakageAdapters.push(...adaptOverlapLeakageInstance(leakage));
    } else if (leakage instanceof PreprocessingLeakageInstance) {
      leakageAdapters.push(...adaptPreprocessingLeakageInstance(leakage));
    } else if (leakage instanceof MultitestLeakageInstance) {
      leakageAdapters.push(...adaptMultitestLeakageInstances(leakage));
    } else {
      console.error('Error: Unknown Leakage Instance Type.');
    }
  });

  return leakageAdapters;
}

export async function getAdaptersFromFile(
  context: vscode.ExtensionContext,
  fsPath: string,
): Promise<LeakageAdapterCell[]> {
  const notebook = await vscode.workspace.openNotebookDocument(
    vscode.Uri.file(fsPath),
  );
  const jupyCells =
    ConversionToPython.convertVSCodeNotebookToJupyCells(notebook);

  const tempDir = await TempDir.getTempDir(fsPath);
  let manager = null;

  try {
    manager = await ConversionToJupyter.convertJSONFile(
      tempDir.getAlgoJupyLineMappingPath(),
    );
  } catch (err) {
    console.error('Notebook has not been analyzed before.', err);
    // diagnosticCollection.delete(editor.document.uri);
    throw new NotAnalyzedError('Notebook has not been analyzed before.');
  }

  const leakages = await new Leakages(
    tempDir.getAlgoOutputDirPath(),
    context,
  ).getLeakages();

  /**
   * Temporary Code
   */

  const rootDir = '/Users/dekomoon/Documents/@BackupExcluded/DataLeakage';

  const prepproc = leakages.filter(
    (leakage) => leakage instanceof PreprocessingLeakageInstance,
  );
  const overlap = leakages.filter(
    (leakage) => leakage instanceof OverlapLeakageInstance,
  );
  const multitest = leakages.filter(
    (leakage) => leakage instanceof MultitestLeakageInstance,
  );

  const obj = {
    preprocessing: prepproc,
    overlap: overlap,
    multitest: multitest,
  };

  const pth = path.join(
    rootDir,
    'media',
    'test',
    'original',
    'result',
    path.basename(fsPath) + '.json',
  );

  fs.writeFileSync(pth, JSON.stringify(obj, null, 2));

  /**
   * Temporary End
   */

  const leakageAdapters = createLeakageAdapters(leakages);
  const rows: LeakageAdapterCell[] = leakageAdapters.map((adapter) => {
    const jupyCellLine = manager.convertPythonLineToJupyCellLine(adapter.line);
    return {
      ...adapter,
      line: jupyCellLine.lineIndex,
      cell: jupyCellLine.cellIndex,
    };
  });

  const res = rows.filter((row) => {
    const cell = jupyCells.find((cell) => cell.index === row.cell);
    if (!cell) {
      console.warn('Warning: Cell not found. Unexpected behavior.');
      return false;
    }
    return cell.data.includes(row.variable);
  });

  // const res = rows;

  return res;
}
