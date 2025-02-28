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
  LeakageType,
  LeakageLines,
  LineInfo,
  LineTag,
  Metadata,
} from '../../data/Leakages/types';

// Import /src/helpers
import { TempDir } from '../TempDir';
import {
  ConversionToJupyter,
  ConversionToPython,
} from '../conversion/LineConversion';

/**
 * Types
 */

export type LeakageAdapter = {
  id: number;
  relationId: number;
  type: LeakageType;
  displayType:
    | 'Overlap Leakage'
    | 'Pre-Processing Leakage'
    | 'Multi-Test Leakage';
  cause: string;
  line: number;
  model: string;
  variable: string;
  info: LineInfo;
  method: string;
};

export type LeakageAdapterCell = {
  id: number;
  relationId: number;
  type: LeakageType;
  displayType:
    | 'Overlap Leakage'
    | 'Pre-Processing Leakage'
    | 'Multi-Test Leakage';
  cause: string;
  line: number;
  cell: number;
  model: string;
  variable: string;
  info: LineInfo;
  method: string;
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

export const INTERNAL_VARIABLE_NAME = 'Name Not Found';

/**
 * Helper Functions
 */

const leakageAdapterHelper = (
  type: LeakageType,
  lines: LeakageLines,
): LeakageAdapter[] => {
  const leakageAdapters: LeakageAdapter[] = Object.entries(lines).map(
    (leakageLine) => {
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

      const renamePrivateVar = (model: string) =>
        /^_var\d+$/.test(model) ? 'Name Not Found' : model;

      const changeUnknown = (method: string) => {
        const sep = method.split('.');
        return sep.length === 2 && sep[0] === 'Unknown'
          ? 'AnonymousModel.' + sep[1]
          : method;
      };

      return {
        id: -1,
        relationId: -1,
        type: type,
        displayType: convertTypeToReadableString(type),
        cause: createCause(type),
        line: Number(leakageLine[0]),
        model: renamePrivateVar(
          renameDuplicates(leakageLine[1].metadata?.model || 'Unknown Model'),
        ),
        variable: renamePrivateVar(
          leakageLine[1].metadata?.variable.replace(/_\d$/, '') ||
            'Unknown Variable',
        ),
        method:
          changeUnknown(leakageLine[1].metadata?.method || 'Unknown Method') +
          '()',
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

  let idIndex = 1;

  for (const type of Object.values(LeakageType)) {
    if (leakages.leakageInstances[type]) {
      leakageAdapters.push(
        ...adaptLeakages(
          type,
          leakages.leakageInstances[type],
          leakages.leakageLines,
        ).map((adapter) => ({
          ...adapter,
          id: idIndex++,
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
