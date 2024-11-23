import * as vscode from 'vscode';
import Leakages from './data/Leakages/Leakages';
import { ButtonViewProvider } from './view/ButtonViewProvider';
import { LeakageInstancesViewProvider } from './view/LeakageInstancesViewProvider';
import { LeakageSummaryViewProvider } from './view/LeakageSummaryViewProvider';

import {
  LEAKAGE_ERROR,
  COLLECTION_NAME,
  COMMAND,
  subscribeToDocumentChanges,
} from './data/notebookDiagnostics';
import LeakageInstance from './data/Leakages/LeakageInstance/LeakageInstance';
import { LeakageType } from './data/Leakages/types';

export function activate(context: vscode.ExtensionContext) {
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

  // Leakage Summary

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

  const changeView = (leakages: LeakageInstance[]) => {
    const overlapLeakageCount = leakages.filter(
      (leakage) => leakage.getLeakageType() === LeakageType.OverlapLeakage,
    ).length;
    const multiTestLeakageCount = leakages.filter(
      (leakage) => leakage.getLeakageType() === LeakageType.MultitestLeakage,
    ).length;
    const preprocessingLeakageCount = leakages.filter(
      (leakage) =>
        leakage.getLeakageType() === LeakageType.PreprocessingLeakage,
    ).length;
    leakageSummaryProvider.changeCount(
      preprocessingLeakageCount,
      multiTestLeakageCount,
      overlapLeakageCount,
    );
  };

  // Button View

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
