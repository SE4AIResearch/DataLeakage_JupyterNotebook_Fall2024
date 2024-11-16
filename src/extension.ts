import * as vscode from 'vscode';
import Leakages from './data/Leakages/Leakages';
import { ButtonViewProvider } from './view/ButtonViewProvider';
import { LeakageOverviewViewProvider } from './view/LeakageOverviewViewProvider';

import {
  COLLECTION_NAME,
  subscribeToDocumentChanges,
} from './data/Diagnostics/notebookDiagnostics';
import LeakageInstance from './data/Leakages/LeakageInstance/LeakageInstance';
import { LeakageType } from './data/Leakages/types';
// import { COMMAND, LeakageInfo } from './data/Diagnostics/LeakageInfo';

export function activate(context: vscode.ExtensionContext) {
  // Test Command for Leakages Class

  const disposable = vscode.commands.registerCommand(
    'dataleakage-jupyternotebook-fall2024.runLeakageDetector',
    async () => {
      try {
        const leakages = new Leakages('src/_output/All/', context);
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

  // Diagnostics

  const notebookDiagnostics =
    vscode.languages.createDiagnosticCollection(COLLECTION_NAME);
  context.subscriptions.push(notebookDiagnostics);
  subscribeToDocumentChanges(context, notebookDiagnostics);

  // Code Actions (Quickfix)

  // context.subscriptions.push(
  //   vscode.languages.registerCodeActionsProvider('python', new LeakageInfo(), {
  //     providedCodeActionKinds: LeakageInfo.providedCodeActionKinds,
  //   }),
  // );

  // context.subscriptions.push(
  //   vscode.commands.registerCommand(COMMAND, () =>
  //     vscode.env.openExternal(
  //       vscode.Uri.parse('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  //     ),
  //   ),
  // );

  // Leakage Overview View

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

  // Leakage Instances in Overview
  leakageOverviewViewProvider.addRows([
    {
      type: 'Multi-Test',
      line: 702,
      variable: 'X_Train',
      cause: 'Repeat data evaluation',
    },
  ]);

  // Leakage Summary in Overview
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
    leakageOverviewViewProvider.changeCount(
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
