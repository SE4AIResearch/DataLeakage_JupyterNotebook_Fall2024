import * as vscode from 'vscode';
import { ButtonViewProvider } from './view/ButtonViewProvider';
import { LeakageOverviewViewProvider } from './view/LeakageOverviewViewProvider';

import {
  COLLECTION_NAME,
  subscribeToDocumentChanges,
} from './data/Diagnostics/notebookDiagnostics';

export function activate(context: vscode.ExtensionContext) {
  /* Diagnostics */

  const notebookDiagnostics =
    vscode.languages.createDiagnosticCollection(COLLECTION_NAME);
  context.subscriptions.push(notebookDiagnostics);
  subscribeToDocumentChanges(context, notebookDiagnostics);

  /* Code Actions (Quickfix) */

  // context.subscriptions.push(
  //   vscode.languages.registerCodeActionsProvider('python', new LeakageInfo(), {
  //     providedCodeActionKinds: LeakageInfo.providedCodeActionKinds,
  //   }),
  // );

  // context.subscriptions.push(
  //   vscode.commands.registerCommand(COMMAND, () =>
  //     vscode.env.openExternal(
  //       vscode.Uri.parse('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  //     ),
  //   ),
  // );

  /* Leakage Overview View */

  const leakageOverviewViewProvider = new LeakageOverviewViewProvider(
    context.extensionUri,
    context,
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LeakageOverviewViewProvider.viewType,
      leakageOverviewViewProvider,
    ),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveNotebookEditor(async () => {
      await leakageOverviewViewProvider.updateTables();
    }),
  );

  /* Button View */

  const changeView = async () =>
    await leakageOverviewViewProvider.updateTables();

  const buttonProvider = new ButtonViewProvider(
    context.extensionUri,
    context,
    changeView,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ButtonViewProvider.viewType,
      buttonProvider,
    ),
  );
}
