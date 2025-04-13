/**
 * Imports
 */

// Import System Modules
import fs from 'fs';

// Import Node Modules
import * as vscode from 'vscode';

// Import /src/data
import Leakages from '../../data/Leakages/Leakages';
import {
  LeakageOutput,
  LeakageInstances,
  LeakageType,
  LeakageLines,
} from '../../data/Leakages/types';

// Import /src/helpers
import { TempDir } from '../TempDir';
import { NotAnalyzedError } from '../CustomError';
import {
  ConversionToJupyter,
  ConversionToPython,
} from '../conversion/LineConversion';

// Import self
import { getVarEqual } from './helpers/getVarEqual';
import { LeakageAdapter, LeakageAdapterCell, VarEquals } from './types/types';
import { createCause } from './helpers/createCause';
import { convertTypeToReadableString } from './helpers/convertTypeToReadableString';
import { replaceVar } from './helpers/replaceVar';
import { changeUnknown } from './helpers/changeUnknown';

/**
 * Variable
 */

let _relationIdIndex = 1;

/**
 * Helper Functions
 */

const leakageAdapterHelper = (
  type: LeakageType,
  lines: LeakageLines,
  varEquals: VarEquals,
  pythonCode: string,
): LeakageAdapter[] => {
  const pythonCodeArr = pythonCode.split('\n');
  const leakageAdapters: LeakageAdapter[] = Object.entries(lines).map(
    (leakageLine) => {
      const lineNumberZeroBased = Number(leakageLine[0]) - 1;

      const data = {
        id: -1,
        gid: -1,
        type: type,
        cause: createCause(type),
        line: lineNumberZeroBased + 1,
        model: leakageLine[1].metadata?.model || 'Unknown Model',
        variable:
          leakageLine[1].metadata?.variable.replace(/_\d$/, '') ||
          'Unknown Variable',
        method: leakageLine[1].metadata?.method || 'Unknown Method',
      };

      return {
        ...data,

        displayId: data.id,
        displayGid: data.gid,
        displayType: convertTypeToReadableString(data.type),
        displayCause: data.cause,
        displayLine: -1,
        displayModel: replaceVar(
          data.model,
          lineNumberZeroBased,
          lines,
          varEquals,
          pythonCodeArr,
        ),
        displayVariable: replaceVar(
          data.variable,
          lineNumberZeroBased,
          lines,
          varEquals,
          pythonCodeArr,
        ),
        displayMethod: changeUnknown(data.method) + '()',
      };
    },
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
  varEquals: VarEquals,
  pythonCode: string,
): LeakageAdapter[] => {
  const lines = getLines(leakageInstance, leakageLines);
  const leakageAdapters = leakageAdapterHelper(
    leakageType,
    lines,
    varEquals,
    pythonCode,
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
async function createLeakageAdapters(
  leakages: LeakageOutput,
  tempDir: TempDir,
): Promise<LeakageAdapter[]> {
  const leakageAdapters: LeakageAdapter[] = [];
  let varEquals;
  let pythonCode;

  try {
    varEquals = await getVarEqual(tempDir.getOutputFilePath('varEquals'));
  } catch (err) {
    console.error('varEquals failed');
    throw err;
  }

  try {
    pythonCode = fs.readFileSync(tempDir.getAlgoInputFilePath(), 'utf-8');
  } catch (err) {
    console.error('Failed to read python code file');
    throw err;
  }

  let idIndex = 1;

  for (const type of Object.values(LeakageType)) {
    if (leakages.leakageInstances[type]) {
      leakageAdapters.push(
        ...adaptLeakages(
          type,
          leakages.leakageInstances[type],
          leakages.leakageLines,
          varEquals,
          pythonCode,
        ).map((adapter) => ({
          ...adapter,
          id: idIndex,
          displayId: idIndex++,
        })),
      );
    }
  }

  // Filter internal variables
  // return leakageAdapters.filter(
  //   (adapter) => !internalVariableRegex.test(adapter.variable),
  // );

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
    'input',
    pythonFileTotalLines, // Assuming fileLines is not needed here
  ).getLeakages();

  const leakageAdapters = await createLeakageAdapters(leakages, tempDir);
  const rows: LeakageAdapterCell[] = leakageAdapters.map((adapter) => {
    const jupyCellLine = manager.convertPythonLineToJupyCellLine(adapter.line);

    console.log('Jupy Cell Line: ', jupyCellLine);
    return {
      ...adapter,
      line: jupyCellLine.lineIndex,
      cell: jupyCellLine.cellIndex,
      displayLine: jupyCellLine.lineIndex + 1,
      displayCell: jupyCellLine.cellIndex + 1,
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

export async function getCounts(fsPath: string) {
  const notebook = await vscode.workspace.openNotebookDocument(
    vscode.Uri.file(fsPath),
  );

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
    'input',
    pythonFileTotalLines, // Assuming fileLines is not needed here
  ).getLeakages();

  return {
    preprocessingCount: leakages.leakageInstances.PreProcessingLeakage.count,
    overlapCount: leakages.leakageInstances.OverlapLeakage.count,
    multiTestCount: leakages.leakageInstances.MultiTestLeakage.count,
  };
}
