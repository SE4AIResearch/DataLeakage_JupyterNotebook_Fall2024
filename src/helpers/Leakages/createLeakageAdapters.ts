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
import {
  ConversionToJupyter,
  ConversionToPython,
} from '../conversion/LineConversion';
import { getVarEquivalences, VarEquals } from './getVarEquivalences';

/**
 * Types
 */

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
 * Variable
 */

let _relationIdIndex = 1;

export const INTERNAL_VARIABLE_NAME = 'Anon Var';

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
      const convertTypeToReadableString = (type: LeakageType) =>
        type === LeakageType.PreProcessingLeakage
          ? 'Pre-Processing Leakage'
          : type === LeakageType.OverlapLeakage
            ? 'Overlap Leakage'
            : 'Multi-Test Leakage';

      const createCause = (type: LeakageType) =>
        type === LeakageType.PreProcessingLeakage
          ? 'Vectorizer fit on train and test data together'
          : type === LeakageType.OverlapLeakage
            ? 'Same/Similar data in both train and test'
            : 'Repeat data evaluation';

      const renameDuplicates = (model: string) => {
        const regex = /_(\d+)$/;
        if (!regex.test(model)) {
          return model;
        }
        const modelTrimmed = model.replace(regex, '');
        const matched = model.match(regex);
        if (matched === null || matched[0] === undefined) {
          console.error(
            'Unknown error occurred while trying to match model ending digits.',
            matched,
            model,
            modelTrimmed,
          );
          return model;
        }

        const lineArr = Object.values(lines);
        const models = lineArr
          .map((line) => line.metadata?.model ?? null)
          .filter((model) => model !== null);

        if (models.includes(modelTrimmed)) {
          return `${modelTrimmed} (${matched[1]})`;
        } else {
          return model;
        }
      };

      const isAnon = (v: string) => /^_var\d+$/.test(v);

      const renameAnonVar = (v: string) =>
        isAnon(v) ? INTERNAL_VARIABLE_NAME : v;

      const changeUnknown = (method: string) => {
        const sep = method.split('.');
        return sep.length === 2 && sep[0] === 'Unknown'
          ? 'AnonModel.' + sep[1]
          : method;
      };

      // TODO: Write code here that help separate the clf and also estimator?

      const replaceVar = (v: string) => {
        const line = pythonCodeArr[lineNumberZeroBased];
        const index = varEquals.equivalences[v];
        if (index === undefined) {
          console.error('Error - Variable not in varEquals');
          return v;
        }
        const group = varEquals.groups[index];
        if (group === undefined) {
          console.error('Error - Index does not exist in group');
          return v;
        }

        // If variable exist in line, do nothing
        if (line.includes(v)) {
          console.log('Variable Exists: ', v, group);
          return v;
        }

        // If variable is of type _varN, then we don't bother checking family and should leave it as Anonymous Variable
        if (isAnon(v)) {
          console.log('Variable is of type _varN: ', v, group);
          return renameAnonVar(v);
        }

        const varsExist = [...group].filter((value: string) =>
          line.includes(value),
        );

        if (varsExist.length === 0 && line.includes(v.replace(/_\d+$/, ''))) {
          // No family visible in line but cropped variable exist in line // Case custom_test2
          console.log('Renamed duplicate variable: ', v, group);
          const res = renameDuplicates(v);

          if (res === v) {
            return v.replace(/_\d+$/, '');
          } else {
            return res;
          }
        } else if (varsExist.length >= 1) {
          // Family visible in line // Case nb_362989
          console.log('Var Family Exists: ', v, group);
          if (varsExist.length > 1) {
            console.warn(
              'Warning - More than one variable in the same group exist in the same line.',
              varsExist,
            );
          }
          return varsExist[0];
        } else {
          console.error(
            'Error - Unknown edge case found: ',
            v,
            varsExist,
            line,
          );
          console.error('Index: ', index);
          console.error('Line Number: ', lineNumberZeroBased);
          console.error(
            'Lines: ',
            pythonCodeArr.slice(
              lineNumberZeroBased - 1,
              lineNumberZeroBased + 2,
            ),
          );
          return v;
        }
      };

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
        displayModel: replaceVar(data.model),
        displayVariable: replaceVar(data.variable),
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
    varEquals = await getVarEquivalences(
      tempDir.getOutputFilePath('varEquals'),
    );
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
