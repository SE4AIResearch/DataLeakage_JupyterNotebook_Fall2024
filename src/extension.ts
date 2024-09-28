import * as vscode from 'vscode';
import { ButtonViewProvider } from './view/ButtonViewProvider';

export function activate(context: vscode.ExtensionContext) {
  const provider = new ButtonViewProvider(context.extensionUri);
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
}

export function deactivate() {}
