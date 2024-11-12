import * as vscode from 'vscode';
import Leakages from './Leakages/Leakages';
import { TempDir } from '../helpers/TempDir';

export const LEAKAGE_ERROR = 'LEAKAGE_ERROR';
export const COLLECTION_NAME = 'notebook_leakage_error';
export const COMMAND = 'data-leakage.quickfix';

function createDiagnostic(
  doc: vscode.TextDocument,
  data: string,
  cellIndex: number,
): vscode.Diagnostic {
  // find where in the line of that the 'emoji' is mentioned
  const index = data.indexOf('numpy');

  // create range that represents, where in the document the word is
  const range = new vscode.Range(cellIndex, index, cellIndex, index + 5);

  const diagnostic = new vscode.Diagnostic(
    range,
    "Sorry, we don't like numpy here.",
    vscode.DiagnosticSeverity.Error,
  );
  diagnostic.code = LEAKAGE_ERROR;

  // const diagnostic = {
  //   range,
  //   message: "Sorry, we don't like numpy here.",
  //   severity: vscode.DiagnosticSeverity.Information,
  //   code: LEAKAGE_ERROR,
  // };
  return diagnostic;
}

/**
 * Analyzes the text document for problems.
 * @param doc text document to analyze
 * @param emojiDiagnostics diagnostic collection
 */
export function refreshDiagnostics(
  doc: vscode.TextDocument,
  diagnosticCollection: vscode.DiagnosticCollection,
  leakageInstance: unknown,
): void {
  if (!doc) {
    return;
  }

  const diagnostics: vscode.Diagnostic[] = [];

  const lines = doc.getText().split('\n');

  lines.forEach((line, index) => {
    if (line.includes('numpy')) {
      diagnostics.push(createDiagnostic(doc, line, index));
    }
  });

  diagnosticCollection.set(doc.uri, diagnostics);
}

// TODO: Should we refactor into a class?
export function subscribeToDocumentChanges(
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection,
): void {
  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(
      vscode.window.activeTextEditor.document,
      diagnosticCollection,
      undefined, // TODO: Add instance of Leakage Class
    );
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.uri.scheme === 'vscode-notebook-cell') {
        const tempDir = await TempDir.getTempDir(editor.document.uri.fsPath);
        const leakages = new Leakages(tempDir.getAlgoOutputDirPath(), context);
        console.log(await leakages.getLeakages());

        // TODO: When the user switches to a different tab, compute hash and use StateManager to check if the corresponding hash is in RAM, if not, we clear diagnostics, if hash exists, then we refresh diagnostics.

        // TODO: Get content of document (assume it is always an ipynb file)

        // TODO: Compute Hash & Retrieve Data from StageManager (if data doesn't exist, return)

        // TODO: Run Terrence's Leakage Class and send it as a third argument

        refreshDiagnostics(editor.document, diagnosticCollection, undefined); // TODO: Add instance of Leakage Class
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(
      (e) => {},
      // refreshDiagnostics(e.document, diagnosticCollection),

      // TODO: When the user adds or deletes a word, compute hash and check StateManager to see if the corresponding hash is in RAM. If not, we clear diagnostics. If it exists, we use the hash data to refresh diagnostics.
    ),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) =>
      diagnosticCollection.delete(doc.uri),
    ),
  );
}
