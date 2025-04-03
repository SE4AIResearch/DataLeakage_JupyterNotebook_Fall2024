import * as vscode from 'vscode';
import { ButtonViewProvider } from './view/ButtonView/ButtonViewProvider';
import { LeakageOverviewViewProvider } from './view/LeakageOverviewViewProvider';

import {
  COLLECTION_NAME,
  subscribeToDocumentChanges,
} from './data/Diagnostics/notebookDiagnostics';
import { QuickFixManual } from './data/Diagnostics/quickFixManual';
import Leakages from './data/Leakages/Leakages';

export async function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'dataleakage-jupyternotebook-fall2024.runLeakageDetector',
    async () => {
      try {
        const leakages = new Leakages(
          '/home/terrence/Projects/stevens/stevens_senior_design/DataLeakage_JupyterNotebook_Fall2024/src/_output/',
          'quick-fix',
          22,
        );
        console.log(
          await leakages.getDataFlowMappings(
            await leakages.getVariableEquivalenceMappings(),
          ),
        );
      } catch (error) {
        console.log(error);
      }
      vscode.window.showInformationMessage(
        'Hello World from DataLeakage_JupyterNotebook_Fall2024!',
      );
    },
  );

  /* Diagnostics */

  const notebookDiagnostics =
    vscode.languages.createDiagnosticCollection(COLLECTION_NAME);
  context.subscriptions.push(notebookDiagnostics);

  const quickFixManual = new QuickFixManual(context, {}, {}, {}, {}, {}, {});

  subscribeToDocumentChanges(context, notebookDiagnostics, quickFixManual);

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('python', quickFixManual, {
      providedCodeActionKinds: QuickFixManual.ProvidedCodeActionKinds,
    }),
  );

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

  const buttonHandler =
    (buttonProvider: ButtonViewProvider, view: 'buttons' | 'settings') =>
    async () =>
      await (view === 'buttons'
        ? buttonProvider.refresh('buttons')
        : buttonProvider.refresh('settings'));

  const buttonProvider = new ButtonViewProvider(
    context.extensionUri,
    context,
    changeView,
    'button',
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ButtonViewProvider.viewType,
      buttonProvider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'data-leakage.showButton',
      buttonHandler(buttonProvider, 'buttons'),
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'data-leakage.showSettings',
      buttonHandler(buttonProvider, 'settings'),
    ),
  );
}
