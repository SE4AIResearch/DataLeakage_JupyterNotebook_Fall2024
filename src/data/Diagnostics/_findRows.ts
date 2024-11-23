import * as vscode from 'vscode';

import { LeakageAdapterCell } from '../../helpers/Leakages/createLeakageAdapters';

export async function findRows(
  editor: vscode.TextEditor,
  fsPath: string,
  adapters: LeakageAdapterCell[],
) {
  // Get the cell that is being focused
  const notebook = await vscode.workspace.openNotebookDocument(
    vscode.Uri.file(fsPath),
  );

  const targetFragment = editor.document.uri.fragment;
  const allFragmentPair = notebook
    .getCells()
    .map((cell, i) => [cell.document.uri.fragment, i]);

  const targetFragmentPair = allFragmentPair.find(
    (fragment) => fragment[0] === targetFragment,
  );

  if (targetFragmentPair === undefined) {
    throw new Error('Error: Cell not found.');
  } else {
    const cellIndex = targetFragmentPair[1];
    return adapters.filter((row) => row.cell === cellIndex);
  }
}
