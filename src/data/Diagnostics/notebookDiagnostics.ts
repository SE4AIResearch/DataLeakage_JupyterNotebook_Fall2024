import * as vscode from 'vscode';
import {
  getAdaptersFromFile,
  INTERNAL_VARIABLE_NAME,
  LeakageAdapterCell,
  NotAnalyzedError,
} from '../../helpers/Leakages/createLeakageAdapters';
import { findRows } from './_findRows';
import { QuickFixProvider } from './QuickFixProvider';

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
    adapterCell.variable === INTERNAL_VARIABLE_NAME
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
      `Variable: ${adapterCell.variable}`,
    ),
    new vscode.DiagnosticRelatedInformation(
      new vscode.Location(doc.uri, range),
      `Model: ${adapterCell.model}`,
    ),
    new vscode.DiagnosticRelatedInformation(
      new vscode.Location(doc.uri, range),
      `Method: ${adapterCell.method}`,
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
    const index =
      adapterCell.variable === INTERNAL_VARIABLE_NAME
        ? 0
        : lineData.indexOf(adapterCell.variable);

    if (index === -1) {
      console.error(
        'Error: Variable not found in line.',
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
  try {
    // Get Adapter
    const fsPath = editor.document.uri.fsPath;
    const adapters = await getAdaptersFromFile(context, fsPath);

    // Get the cell that is being focused
    const rows = await findRows(editor, fsPath, adapters);

    refreshNotebookDiagnostics(editor.document, diagnosticCollection, rows);

    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
        'python',
        await QuickFixProvider.create(context),
        {
          providedCodeActionKinds: QuickFixProvider.ProvidedCodeActionKinds,
        },
      ),
    );
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
