import * as vscode from 'vscode';
import { ButtonViewProvider } from './view/ButtonViewProvider';
import { LeakageInstancesViewProvider } from './view/LeakageInstancesViewProvider';

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
}

export function deactivate() {}
