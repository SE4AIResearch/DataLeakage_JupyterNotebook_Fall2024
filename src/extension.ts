import * as vscode from 'vscode';
import { ButtonViewProvider } from './view/ButtonViewProvider';
import { LeakageInstances } from "./view/LeakageInstances";

export function activate(context: vscode.ExtensionContext) {
  const provider = new ButtonViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ButtonViewProvider.viewType,
      provider,
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('data-leakage.analyzeNotebook', () => {
      provider.analyzeNotebook();
    }),
  );

  new LeakageInstances(context);
}

export function deactivate() {}
