import * as vscode from 'vscode';
import {
  getAdaptersFromFile,
  INTERNAL_VARIABLE_NAME,
  LeakageAdapterCell,
  NotAnalyzedError,
} from '../../helpers/Leakages/createLeakageAdapters';
import { findRows } from './_findRows';
import { QuickFixManual } from './quickFixManual';

export const LEAKAGE_ERROR = 'dataLeakage';
export const COLLECTION_NAME = 'notebook_leakage_error';

function createNotebookDiagnostic(
  doc: vscode.TextDocument,
  index: number,
  adapterCell: LeakageAdapterCell,
): vscode.Diagnostic {
  // FIXME: limit of this extension is that we can't tell which variable in the line caused the problem if there are multiple same variables in the line

  const endOfCharacterAtLine = doc.lineAt(adapterCell.line).range.end.character;

  const range =
    adapterCell.displayVariable === INTERNAL_VARIABLE_NAME
      ? new vscode.Range(
          adapterCell.line,
          0,
          adapterCell.line,
          endOfCharacterAtLine,
        )
      : new vscode.Range(
          adapterCell.line,
          index,
          adapterCell.line,
          index + adapterCell.variable.length,
        );

  const diagnostic = new vscode.Diagnostic(
    range,
    `Data Leakage: ${adapterCell.type}`,
    vscode.DiagnosticSeverity.Error,
  );
  diagnostic.code = LEAKAGE_ERROR;
  diagnostic.source = adapterCell.type;
  diagnostic.relatedInformation = [
    new vscode.DiagnosticRelatedInformation(
      new vscode.Location(doc.uri, range),
      `Variable: ${adapterCell.displayVariable}`,
    ),
    new vscode.DiagnosticRelatedInformation(
      new vscode.Location(doc.uri, range),
      `Model: ${adapterCell.displayModel}`,
    ),
    new vscode.DiagnosticRelatedInformation(
      new vscode.Location(doc.uri, range),
      `Method: ${adapterCell.displayMethod}`,
    ),
  ];

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
    let index =
      adapterCell.displayVariable === INTERNAL_VARIABLE_NAME
        ? 0
        : lineData.indexOf(adapterCell.displayVariable);

    if (index === -1) {
      console.warn(
        'Warning: Variable not found in line.',
        adapterCell.displayVariable,
        lineData,
      );
      index = 0;
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
  quickFixManual: QuickFixManual,
) => {
  try {
    // Get Adapter
    const fsPath = editor.document.uri.fsPath;
    const adapters = await getAdaptersFromFile(context, fsPath);

    // Get the cell that is being focused
    const rows = await findRows(editor, fsPath, adapters);

    refreshNotebookDiagnostics(editor.document, diagnosticCollection, rows);
    await quickFixManual.getData(context);
  } catch (err) {
    if (err instanceof NotAnalyzedError) {
      console.warn('Warning: Notebook has not been analyzed before.', err);
      diagnosticCollection.delete(editor.document.uri);
    } else {
      throw err;
    }
  }
};

// TODO: Should we refactor into a class?
export function subscribeToDocumentChanges(
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection,
  quickFixManual: QuickFixManual,
): void {
  if (vscode.window.activeTextEditor) {
    const editor = vscode.window.activeTextEditor;

    if (editor && editor.document.uri.scheme === 'vscode-notebook-cell') {
      configureNotebookDiagnostics(
        context,
        editor,
        diagnosticCollection,
        quickFixManual,
      ); // async fn
    }
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.uri.scheme === 'vscode-notebook-cell') {
        await configureNotebookDiagnostics(
          context,
          editor,
          diagnosticCollection,
          quickFixManual,
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
