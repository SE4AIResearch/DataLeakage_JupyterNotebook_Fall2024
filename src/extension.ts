import * as vscode from 'vscode';
import Leakages from './data/Leakages/Leakages';
// import { ButtonViewProvider } from './view/ButtonViewProvider';
// import { LeakageOverviewViewProvider } from './view/LeakageOverviewViewProvider';

// import {
//   COLLECTION_NAME,
//   subscribeToDocumentChanges,
// } from './data/notebookDiagnostics';
// import { LeakageType } from './data/Leakages/types';

export function activate(context: vscode.ExtensionContext) {
  // Test Command for Leakages Class

  const disposable = vscode.commands.registerCommand(
    'dataleakage-jupyternotebook-fall2024.runLeakageDetector',
    async () => {
      try {
        const leakages = new Leakages(
          '/home/terrence/Projects/leakage-analysis/tests/inputs',
          'nb_303674',
          397,
        );
        const output = await leakages.getLeakages();
        console.log(output);
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

  // const notebookDiagnostics =
  //   vscode.languages.createDiagnosticCollection(COLLECTION_NAME);
  // context.subscriptions.push(notebookDiagnostics);
  // subscribeToDocumentChanges(context, notebookDiagnostics);

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

  // const leakageOverviewViewProvider = new LeakageOverviewViewProvider(
  //   context.extensionUri,
  //   context,
  // );

  // context.subscriptions.push(
  //   vscode.window.registerWebviewViewProvider(
  //     LeakageOverviewViewProvider.viewType,
  //     leakageOverviewViewProvider,
  //   ),
  // );

  // context.subscriptions.push(
  //   vscode.window.registerWebviewViewProvider(
  //     LeakageSummaryViewProvider.viewType,
  //     leakageSummaryProvider,
  //   ),
  // );

  // const changeView = (leakages: LeakageInstance[]) => {
  //   const overlapLeakageCount = leakages.filter(
  //     (leakage) => leakage.getLeakageType() === LeakageType.OverlapLeakage,
  //   ).length;
  //   const multiTestLeakageCount = leakages.filter(
  //     (leakage) => leakage.getLeakageType() === LeakageType.MultitestLeakage,
  //   ).length;
  //   const preprocessingLeakageCount = leakages.filter(
  //     (leakage) =>
  //       leakage.getLeakageType() === LeakageType.PreprocessingLeakage,
  //   ).length;
  //   leakageSummaryProvider.changeCount(
  //     preprocessingLeakageCount,
  //     multiTestLeakageCount,
  //     overlapLeakageCount,
  //   );
  // };

  // Button View

  // const buttonProvider = new ButtonViewProvider(
  //   context.extensionUri,
  //   context,
  //   changeView,
  // );
  // context.subscriptions.push(
  //   vscode.window.registerWebviewViewProvider(
  //     ButtonViewProvider.viewType,
  //     buttonProvider,
  //   ),
  // );
}
