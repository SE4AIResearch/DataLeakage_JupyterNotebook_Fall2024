import * as vscode from 'vscode';
import {
  getAdaptersFromFile,
  LeakageAdapterCell,
} from '../../helpers/Leakages/createLeakageAdapters';

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
