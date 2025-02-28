/**
 * Imports
 */

// Import Node Modules
import * as vscode from 'vscode';

// Import /src/data
import Leakages from '../../data/Leakages/Leakages';
import {
  LeakageOutput,
  LeakageInstances,
  Metadata,
  LeakageType,
  LeakageLines,
  LineInfo,
} from '../../data/Leakages/types';

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
  type: LeakageType;
  line: number;
  variable: string;
  info: LineInfo;
};

export type LeakageAdapterCell = {
  type: LeakageType;
  line: number;
  cell: number;
  variable: string;
  info: LineInfo;
};

export type LeakageAdapterExtra = {
  leakageAdapters: LeakageAdapter[];
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
 * Constants
 */

export const INTERNAL_VARIABLE_NAME = 'Internal Variable';

/**
 * Helper Functions
 */

const leakageAdapterHelper = (
  type: LeakageType,
  lines: LeakageLines,
): LeakageAdapter[] => {
  const leakageAdapters: LeakageAdapter[] = Object.entries(lines).map(
    (leakageLine) => ({
      type: type,
      line: Number(leakageLine[0]),
      // variable:
      //   typeof metadata.variable === 'string'
      //     ? metadata.variable.replace(/_0$/, '')
      //     : '',
      variable: leakageLine[1].metadata?.variable || 'Unknown Variable',
      info: leakageLine[1],
    }),
  );

  return leakageAdapters;
};

const getLines = (
  leakageInstance: LeakageInstances[LeakageType],
  leakageLines: LeakageLines,
) =>
  Object.entries(leakageLines)
    .filter((line) => leakageInstance.lines.includes(Number(line[0])))
    .reduce(
      (acc: LeakageLines, [key, value]): LeakageLines =>
        Object.assign(acc, { [Number(key)]: value }),
      {},
    );

const adaptLeakages = (
  leakageType: LeakageType,
  leakageInstance: LeakageInstances[LeakageType],
  leakageLines: LeakageLines,
): LeakageAdapter[] => {
  const lines = getLines(leakageInstance, leakageLines);
  const leakageAdapters = leakageAdapterHelper(leakageType, lines);
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
  leakages: LeakageOutput,
): LeakageAdapter[] {
  const leakageAdapters: LeakageAdapter[] = [];

  for (const type of Object.values(LeakageType)) {
    if (leakages.leakageInstances[type]) {
      leakageAdapters.push(
        ...adaptLeakages(
          type,
          leakages.leakageInstances[type],
          leakages.leakageLines,
        ),
      );
    }
  }

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
    throw new NotAnalyzedError('Notebook has not been analyzed before.');
  }

  const pythonFileTotalLines = ConversionToPython.convertJupyCellsToPythonCode(
    manager.getJupyCells(),
  ).split('\n').length;

  const leakages = await new Leakages(
    tempDir.getAlgoOutputDirPath(),
    path.basename(fsPath),
    pythonFileTotalLines, // Assuming fileLines is not needed here
  ).getLeakages();

  const leakageAdapters = createLeakageAdapters(leakages);
  const rows: LeakageAdapterCell[] = leakageAdapters.map((adapter) => {
    const jupyCellLine = manager.convertPythonLineToJupyCellLine(adapter.line);
    return {
      ...adapter,
      line: jupyCellLine.lineIndex,
      cell: jupyCellLine.cellIndex,
    };
  });

  const res = rows.map((row) => {
    const cell = jupyCells.find((cell) => cell.index === row.cell);
    if (!cell) {
      console.warn('Warning: Cell not found.');
      throw new Error('Cell not found.');
    }
    // if (!cell.data.includes(row.variable)) {
    //   console.warn('Warning: Internal variable found in cell.');
    //   row.variable = INTERNAL_VARIABLE_NAME;
    // }
    return row;
  });

  console.log('RESULT: ', res);

  return res;
}
