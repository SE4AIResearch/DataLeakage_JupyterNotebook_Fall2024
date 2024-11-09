import * as vscode from 'vscode';
import { ButtonViewProvider } from './view/ButtonViewProvider';

import {
  LEAKAGE_ERROR,
  COLLECTION_NAME,
  COMMAND,
  subscribeToDocumentChanges,
} from './data/notebookDiagnostics';

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

  const notebookDiagnostics =
    vscode.languages.createDiagnosticCollection(COLLECTION_NAME);
  context.subscriptions.push(notebookDiagnostics);
  subscribeToDocumentChanges(context, notebookDiagnostics);

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      'markdown',
      new LeakageInfo(),
      {
        providedCodeActionKinds: LeakageInfo.providedCodeActionKinds,
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND, () =>
      vscode.env.openExternal(
        vscode.Uri.parse('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      ),
    ),
  );
}

/**
 * Provides code actions corresponding to diagnostic problems.
 */
export class LeakageInfo implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
    _document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    // for each diagnostic entry that has the matching `code`, create a code action command
    return context.diagnostics
      .filter((diagnostic) => diagnostic.code === LEAKAGE_ERROR)
      .map((diagnostic) => this.createCommandCodeAction(diagnostic));
  }

  private createCommandCodeAction(
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Learn more...',
      vscode.CodeActionKind.QuickFix,
    );
    action.command = {
      command: COMMAND,
      title: 'Quickfix',
      tooltip: 'Quickfix',
    };
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    return action;
  }
}

export function deactivate() {}
