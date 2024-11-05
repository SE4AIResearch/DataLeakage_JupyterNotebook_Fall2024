import * as vscode from 'vscode';
import { ButtonViewProvider } from './view/ButtonViewProvider';
import { LeakageInstancesViewProvider } from './view/LeakageInstancesViewProvider';
import { LeakageSummaryViewProvider } from './view/LeakageSummaryViewProvider';

export function activate(context: vscode.ExtensionContext) {
  const buttonProvider = new ButtonViewProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ButtonViewProvider.viewType,
      buttonProvider,
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('data-leakage.analyzeNotebook', () => {
      buttonProvider.analyzeNotebook();
    }),
  );

  const leakageInstanceProvider = new LeakageInstancesViewProvider(
    context.extensionUri,
    context,
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LeakageInstancesViewProvider.viewType,
      leakageInstanceProvider,
    ),
  );

  leakageInstanceProvider.addRows([
    {
      type: 'Multi-Test',
      line: 702,
      variable: 'X_Train',
      cause: 'Repeat data evaluation',
    },
  ]);

  // Leakage summary
  const leakageSummaryProvider = new LeakageSummaryViewProvider(
    context.extensionUri,
    context,
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LeakageSummaryViewProvider.viewType,
      leakageSummaryProvider,
    ),
  );

  setTimeout(() => {
    leakageSummaryProvider.changeCount(2, 3, 4);
  }, 5000);
  
}

export function deactivate() {}
