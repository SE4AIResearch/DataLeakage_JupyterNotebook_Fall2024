import * as vscode from 'vscode';
import { LEAKAGE_ERROR } from './notebookDiagnostics';

export const COMMAND = 'data-leakage.quickfix';

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
      .map((diagnostic) => this.createFix(diagnostic));
  }

  private createFix(diagnostic: vscode.Diagnostic): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Leakage Quickfix Suggestion',
      vscode.CodeActionKind.QuickFix,
    );
    action.command = {
      command: COMMAND,
      title: 'Generate Suggestion',
      tooltip: 'This will generate suggestions on how to fix leakage issues.',
    };
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    return action;
  }
}
export function deactivate() {}
