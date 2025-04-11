import * as vscode from 'vscode';
import {
  getAdaptersFromFile,
  LeakageAdapterCell,
} from '../../helpers/Leakages/createLeakageAdapters';
import { Row } from '../../validation/table';

export async function _updateViewIfNotebookOpen(
  context: vscode.ExtensionContext,
  updateFn: (adapters: LeakageAdapterCell[]) => void,
) {
  if (
    vscode.window.activeNotebookEditor &&
    vscode.window.activeNotebookEditor.notebook.uri.scheme === 'file'
  ) {
    const adapters = await getAdaptersFromFile(
      context,
      vscode.window.activeNotebookEditor.notebook.uri.fsPath,
    );

    updateFn(adapters);
  }
}

export async function goToLeakageLine(row: Row) {
  if (
    vscode.window.activeNotebookEditor &&
    vscode.window.activeNotebookEditor.notebook.uri.scheme === 'file'
  ) {
    const notebook = vscode.window.activeNotebookEditor.notebook;
    // Get array of cells and get line # of cell
    const cell = notebook.getCells().find((_, idx) => idx === row.cell - 1);
    if (cell === undefined) {
      vscode.window.showErrorMessage(
        'Cell not found in your Jupyter Notebook.',
      );
      return;
    }
    const document = cell.document;
    const textDocument = await vscode.workspace.openTextDocument(document.uri);
    const editor = await vscode.window.showTextDocument(textDocument);

    const displayLine = row.line;
    const zeroBasedLine = displayLine - 1;
    const range = editor.document.lineAt(zeroBasedLine).range;

    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range);
  }
}
