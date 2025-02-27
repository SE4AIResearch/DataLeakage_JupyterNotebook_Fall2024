import * as vscode from 'vscode';
import Leakages from './data/Leakages/Leakages';
import { ButtonViewProvider } from './view/ButtonViewProvider';
import { SettingsViewProvider } from './view/SettingsViewProvider';
import { LeakageOverviewViewProvider } from './view/LeakageOverviewViewProvider';

import {
  COLLECTION_NAME,
  subscribeToDocumentChanges,
} from './data/Diagnostics/notebookDiagnostics';
import {
  getAdaptersFromFile,
  LeakageAdapterCell,
} from './helpers/Leakages/createLeakageAdapters';

export function activate(context: vscode.ExtensionContext) {
  // Test Command for Leakages Class

  const disposable = vscode.commands.registerCommand(
    'dataleakage-jupyternotebook-fall2024.runLeakageDetector',
    async () => {
      try {
        const leakages = new Leakages(
          '/home/terrence/Projects/leakage-analysis/tests/inputs/nb_303674-fact/',
          context,
        );
        console.log(await leakages.getLeakages());
      } catch (error) {
        console.log(error);
      }
      vscode.window.showInformationMessage(
        'Hello World from DataLeakage_JupyterNotebook_Fall2024!',
      );
    },
  );
  context.subscriptions.push(disposable);

  // Diagnostics

  const notebookDiagnostics =
    vscode.languages.createDiagnosticCollection(COLLECTION_NAME);
  context.subscriptions.push(notebookDiagnostics);
  subscribeToDocumentChanges(context, notebookDiagnostics);

  // Code Actions (Quickfix)

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

  // Leakage Overview View

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

  // Button View

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

  const settingsProvider = new SettingsViewProvider(
    context.extensionUri,
    context,
    changeView,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SettingsViewProvider.viewType,
      settingsProvider,
    ),
  );
}
