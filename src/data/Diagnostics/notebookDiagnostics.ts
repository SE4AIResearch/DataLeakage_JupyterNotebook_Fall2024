import * as vscode from 'vscode';
import Leakages from '..//Leakages/Leakages';
import { TempDir } from '../../helpers/TempDir';
import {
  createLeakageAdapters,
  LeakageAdapterCell,
} from './createLeakageAdapters';
import {
  ConversionToJupyter,
  ConversionToPython,
} from '../../helpers/conversion/LineConversion';

export const LEAKAGE_ERROR = 'dataLeakage';
export const COLLECTION_NAME = 'notebook_leakage_error';
export const COMMAND = 'data-leakage.quickfix';

function createNotebookDiagnostic(
  doc: vscode.TextDocument,
  index: number,
  adapterCell: LeakageAdapterCell,
): vscode.Diagnostic {
  // limit of this program is that we can't tell which variable in the line caused the problem if there are multiple same variables in the line

  const range = new vscode.Range(
    adapterCell.line,
    index,
    adapterCell.line,
    index + adapterCell.variable.length,
  );

  const cause = adapterCell.cause
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const diagnostic = new vscode.Diagnostic(
    range,
    `${adapterCell.cause}${cause !== '' ? ':' : ''} ${cause}`,
    vscode.DiagnosticSeverity.Error,
  );
  diagnostic.code = LEAKAGE_ERROR;

  return diagnostic;
}

function refreshNotebookDiagnostics(
  doc: vscode.TextDocument,
  diagnosticCollection: vscode.DiagnosticCollection,
  adapterCells: LeakageAdapterCell[],
): void {
  const cellText = doc.getText();
  const diagnostics: vscode.Diagnostic[] = [];

  for (const adapterCell of adapterCells) {
    const lineData = cellText.split('\n')[adapterCell.line];
    const index = lineData.indexOf(adapterCell.variable);
    if (index === -1) {
      console.warn(
        'Warning: Variable not found in line. Most likely an internal variable.',
        adapterCell,
        lineData,
      );
      continue;
    }
    const diagnostic = createNotebookDiagnostic(doc, index, adapterCell);
    diagnostics.push(diagnostic);
  }

  diagnosticCollection.set(doc.uri, diagnostics);
}

const configureNotebookDiagnostics = async (
  context: vscode.ExtensionContext,
  editor: vscode.TextEditor,
  diagnosticCollection: vscode.DiagnosticCollection,
) => {
  const fsPath = editor.document.uri.fsPath;
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
    console.error('Notebook has not been analyzed before', err);
    diagnosticCollection.delete(editor.document.uri);
    return;
  }

  const leakages = await new Leakages(
    tempDir.getAlgoOutputDirPath(),
    context,
  ).getLeakages();

  const leakageAdapters = createLeakageAdapters(leakages);
  const tableRows: LeakageAdapterCell[] = leakageAdapters.map((adapter) => {
    const jupyCellLine = manager.convertPythonLineToJupyCellLine(adapter.line);
    return {
      ...adapter,
      line: jupyCellLine.lineIndex,
      cell: jupyCellLine.cellIndex,
    };
  });

  const targetCellData = editor.document.getText();

  const resultingCell = jupyCells.filter(
    (cell) => cell.data === targetCellData,
  );

  if (!resultingCell[0]) {
    throw new Error('Error: Cell not found.');
  } else {
    const cellIndex = resultingCell[0].index;
    const rows = tableRows.filter((row) => row.cell === cellIndex);
    refreshNotebookDiagnostics(editor.document, diagnosticCollection, rows);
  }
};

// TODO: Should we refactor into a class?
export function subscribeToDocumentChanges(
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection,
): void {
  if (vscode.window.activeTextEditor) {
    const editor = vscode.window.activeTextEditor;

    if (editor && editor.document.uri.scheme === 'vscode-notebook-cell') {
      configureNotebookDiagnostics(context, editor, diagnosticCollection); // async fn
    }
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.uri.scheme === 'vscode-notebook-cell') {
        await configureNotebookDiagnostics(
          context,
          editor,
          diagnosticCollection,
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) =>
      diagnosticCollection.delete(doc.uri),
    ),
  );
}
