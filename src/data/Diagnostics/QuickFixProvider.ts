import * as vscode from 'vscode';
import { LeakageType } from '../Leakages/types';
import { LEAKAGE_ERROR } from './notebookDiagnostics';
import { LeakageAdapterCell } from '../../helpers/Leakages/createLeakageAdapters';

export const COMMAND = 'data-leakage.quickfix';

/**
 * Provides code actions corresponding to diagnostic problems.
 */
export class QuickFixProvider implements vscode.CodeActionProvider {
  public static readonly ProvidedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  private adapters: LeakageAdapterCell[];

  constructor(adapters: LeakageAdapterCell[]) {
    this.adapters = adapters;
  }

  provideCodeActions(
    _document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    console.log(this.adapters);
    return context.diagnostics
      .filter((diagnostic) => diagnostic.code === LEAKAGE_ERROR)
      .map((diagnostic) => this.createFix(diagnostic))
      .filter((fix) => !!fix);
  }

  private createFix(diagnostic: vscode.Diagnostic): vscode.CodeAction | null {
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
    action.edit = new vscode.WorkspaceEdit();
    switch (diagnostic.source) {
      case LeakageType.OverlapLeakage:
        break;
      case LeakageType.PreProcessingLeakage:
        break;
      case LeakageType.MultiTestLeakage:
        break;
    }

    return action;
  }
}
export function deactivate() {}
