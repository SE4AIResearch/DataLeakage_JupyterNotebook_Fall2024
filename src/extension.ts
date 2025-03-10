import * as vscode from 'vscode';
import { ButtonViewProvider } from './view/ButtonViewProvider';
import { SettingsViewProvider } from './view/SettingsViewProvider';
import { LeakageOverviewViewProvider } from './view/LeakageOverviewViewProvider';

import {
  COLLECTION_NAME,
  subscribeToDocumentChanges,
} from './data/Diagnostics/notebookDiagnostics';
import { quickFixLLM } from './data/Diagnostics/quickFixLLM';

export function activate(context: vscode.ExtensionContext) {
  /* Diagnostics */

  const notebookDiagnostics =
    vscode.languages.createDiagnosticCollection(COLLECTION_NAME);
  context.subscriptions.push(notebookDiagnostics);
  subscribeToDocumentChanges(context, notebookDiagnostics);

  context.subscriptions.push(
    vscode.commands.registerCommand('dataleakage-jupyternotebook-fall2024.quickFixLLM', quickFixLLM),
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

  const buttonProvider = new ButtonViewProvider(
    context.extensionUri,
    context,
    changeView,
    "button"
  );
  const refreshViewButtons = async() =>
    await buttonProvider.refresh("buttons");

  const refreshViewSettings = async() =>
    await buttonProvider.refresh("settings");

  const buttonProvider2 = new ButtonViewProvider(
    context.extensionUri,
    context,
    changeView,
    "settings"
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
  /*context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SettingsViewProvider.viewType,
      settingsProvider,
    ),
  );*/

  const buttonHandler = async () =>
    {
/*       context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
          ButtonViewProvider.viewType,
          buttonProvider,
        ),
      ); */
      await refreshViewButtons();
    }

  const buttonHandler2 = async () =>
    {
      /* console.log(context.subscriptions);
      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
          ButtonViewProvider.viewType,
          buttonProvider2,
        ),
      ); */
      await refreshViewSettings();
    }

  const settingsHandler = () =>
  {
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        SettingsViewProvider.viewType,
        settingsProvider,
      ),
    );
  }

  context.subscriptions.push(vscode.commands.registerCommand("data-leakage.showButton", buttonHandler));
  context.subscriptions.push(vscode.commands.registerCommand("data-leakage.showSettings", buttonHandler2));
}
