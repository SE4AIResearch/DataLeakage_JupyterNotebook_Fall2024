import LeakageInstance from '../../Leakages/LeakageInstance/LeakageInstance';
import MultitestLeakageInstance from '../../Leakages/LeakageInstance/MultitestLeakageInstance';
import OverlapLeakageInstance from '../../Leakages/LeakageInstance/OverlapLeakageInstance';
import PreprocessingLeakageInstance from '../../Leakages/LeakageInstance/PreprocessingLeakageInstance';
import Leakages from '../../Leakages/Leakages';

import * as vscode from 'vscode';
import { TempDir } from '../../../helpers/TempDir';
import {
  ConversionToJupyter,
  ConversionToPython,
  JupyCell,
} from '../../../helpers/conversion/LineConversion';

export type LeakageAdapter = {
  type: string;
  line: number;
  variable: string;
  cause: string;
  parent: null | Array<LeakageAdapter>; // not sure what to do with this but it is an array of testingData that are related to each other (array includes the object itself)
};

export type LeakageAdapterCell = {
  type: string;
  line: number;
  cell: number;
  variable: string;
  cause: string;
  parent: null | Array<LeakageAdapter>; // not sure what to do with this but it is an array of testingData that are related to each other (array includes the object itself)
};

export class NotAnalyzedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotAnalyzedError';
  }
}

const adaptOverlapLeakageInstance = (
  leakage: OverlapLeakageInstance,
): LeakageAdapter => {
  const cause = leakage.getSource().getCause().toString();
  const testData = leakage.getTestingData();

  const testAdapter = {
    type: 'Overlap',
    line: typeof testData.line === 'number' ? testData.line : -1,
    variable: typeof testData.variable === 'string' ? testData.variable : '',
    cause,
    parent: null,
  };

  return testAdapter;
};

const adaptPreprocessingLeakageInstance = (
  leakage: PreprocessingLeakageInstance,
): LeakageAdapter => {
  const cause = leakage.getSource().getCause().toString();
  const testData = leakage.getTestingData();
  const trainingData = leakage.getTrainingData();

  const testAdapter = {
    type: 'Preprocessing',
    line: typeof testData.line === 'number' ? testData.line : -1,
    variable: typeof testData.variable === 'string' ? testData.variable : '',
    cause,
    parent: null,
  };

  return testAdapter;
};

const adaptMultitestLeakageInstances = (
  leakage: MultitestLeakageInstance,
): LeakageAdapter[] => {
  const leakageAdapters = leakage
    .getOccurrences()
    .map((o) => o.testingData)
    .map((metadataArray) =>
      metadataArray
        .map((metadata) => ({
          type: 'Multi-Test',
          line: typeof metadata.line === 'number' ? metadata.line : -1,
          variable:
            typeof metadata.variable === 'string' ? metadata.variable : '',
          cause: 'repeatDataEvaluation',
          parent: null,
        }))
        .map((leakageAdapter, _, arr) => ({ ...leakageAdapter, parent: arr })),
    )
    .flat();

  return leakageAdapters;
};

export function createLeakageAdapters(
  leakages: LeakageInstance[],
): LeakageAdapter[] {
  const leakageAdapters: LeakageAdapter[] = [];

  leakages.forEach((leakage) => {
    if (leakage instanceof OverlapLeakageInstance) {
      leakageAdapters.push(adaptOverlapLeakageInstance(leakage));
    } else if (leakage instanceof PreprocessingLeakageInstance) {
      leakageAdapters.push(adaptPreprocessingLeakageInstance(leakage));
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

  return res;
}
