import * as vscode from 'vscode';
import * as path from 'path';
import { TempDir } from './helpers/TempDir';
import { ButtonViewProvider } from './view/ButtonView/ButtonViewProvider';
import { LeakageOverviewViewProvider } from './view/LeakageOverviewView/LeakageOverviewViewProvider';

import {
  COLLECTION_NAME,
  subscribeToDocumentChanges,
} from './data/Diagnostics/notebookDiagnostics';
import { QuickFixManual } from './data/Diagnostics/quickFixManual';
import Leakages from './data/Leakages/Leakages';

export async function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'dataleakage-jupyternotebook-fall2024.runLeakageDetector',
    async () => {
      try {
        const leakages = new Leakages(
          '/home/arnav/Documents/Classes/CS423/Projects/leakage-analysis-docker-free/tests/inputs',
          'quick_fix',
          22,
        );
        console.log(
          await leakages.getDataFlowMappings(
            await leakages.getVariableEquivalenceMappings(),
          ),
        );
      } catch (error) {
        console.log(error);
      }
      vscode.window.showInformationMessage(
        'Hello World from DataLeakage_JupyterNotebook_Fall2024!',
      );
    },
  );

  /* Diagnostics */

  const notebookDiagnostics =
    vscode.languages.createDiagnosticCollection(COLLECTION_NAME);
  context.subscriptions.push(notebookDiagnostics);

  const quickFixManual = new QuickFixManual(
    context,
    {},
    {},
    {},
    {},
    {},
    {},
    {},
  );

  subscribeToDocumentChanges(context, notebookDiagnostics, quickFixManual);

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('python', quickFixManual, {
      providedCodeActionKinds: QuickFixManual.ProvidedCodeActionKinds,
    }),
  );

  // Quick Fix action for data leakage
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'data-leakage.applyAndPreviewFix',
      async (documentUri: vscode.Uri, leakageType: string, line: number) => {
        try {
          // 1. Save the original content
          const document = await vscode.workspace.openTextDocument(documentUri);
          const originalContent = document.getText();

          // 2. Create the edit
          const edit = await quickFixManual.generateFixEdit(
            documentUri,
            leakageType,
            line,
          );

          // 3. Find notebook cell info
          const cellInfo =
            await quickFixManual.findNotebookCellInfo(documentUri);

          // 4. Apply the edit
          await vscode.workspace.applyEdit(edit);

          // 5. Create temporary files for diff view
          const tempDir = await TempDir.getTempDir(
            cellInfo ? cellInfo.notebook.uri.fsPath : documentUri.fsPath,
          );
          const originalFile = vscode.Uri.file(
            path.join(tempDir.getAlgoDirPath(), 'original.py'),
          );
          const modifiedFile = vscode.Uri.file(
            path.join(tempDir.getAlgoDirPath(), 'modified.py'),
          );

          // 6. Write files for comparison
          await vscode.workspace.fs.writeFile(
            originalFile,
            Buffer.from(originalContent),
          );
          await vscode.workspace.fs.writeFile(
            modifiedFile,
            Buffer.from(document.getText()),
          );

          // 7. Show diff view
          const title = cellInfo
            ? `Fix for ${leakageType} in Cell #${cellInfo.cellIndex + 1}`
            : `Fix for ${leakageType}`;

          await vscode.commands.executeCommand(
            'vscode.diff',
            originalFile,
            modifiedFile,
            title,
          );

          // 8. Ask user to keep or revert Quick Fix changes
          const choice = await vscode.window.showInformationMessage(
            'Do you want to keep these changes?',
            { modal: true },
            'Keep Changes',
          );

          // 9. Revert if requested
          // Cancel is a default choice
          if (choice !== 'Keep Changes') {
            const revertEdit = new vscode.WorkspaceEdit();
            revertEdit.replace(
              documentUri,
              new vscode.Range(0, 0, document.lineCount, 0),
              originalContent,
            );
            await vscode.workspace.applyEdit(revertEdit);
            vscode.window.showInformationMessage('Changes reverted.');
          } else {
            vscode.window.showInformationMessage(
              'Data leakage fix applied successfully.',
            );
            // Add a detailed message about what was fixed
            let fixMessage = '';
            switch (leakageType) {
              case 'OverlapLeakage':
                fixMessage =
                  'Fixed overlap data leakage by using independent test data for evaluation.';
                break;
              case 'PreProcessingLeakage':
                fixMessage =
                  'Fixed preprocessing leakage by moving feature selection after train/test split.';
                break;
              case 'MultiTestLeakage':
                fixMessage =
                  'Fixed multi-test leakage by using independent test data.';
                break;
              default:
                throw new Error(
                  `Unknown leakage type: ${leakageType}. Expected 'OverlapLeakage', 'PreProcessingLeakage', or 'MultiTestLeakage'.`,
                );
            }
            if (fixMessage) {
              vscode.window.showInformationMessage(fixMessage);
            }
          }
        } catch (error) {
          console.error(error);
          vscode.window.showErrorMessage(
            `Error applying fix: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    ),
  );

  /* Leakage Overview View */

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

  context.subscriptions.push(
    vscode.window.onDidChangeActiveNotebookEditor(async () => {
      await leakageOverviewViewProvider.updateTables();
    }),
  );

  /* Button View */

  const changeView = async () =>
    await leakageOverviewViewProvider.updateTables();

  const buttonHandler =
    (buttonProvider: ButtonViewProvider, view: 'buttons' | 'settings') =>
    async () =>
      await (view === 'buttons'
        ? buttonProvider.refresh('buttons')
        : buttonProvider.refresh('settings'));

  const buttonProvider = new ButtonViewProvider(
    context.extensionUri,
    context,
    changeView,
    'buttons',
    notebookDiagnostics,
    quickFixManual,
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ButtonViewProvider.viewType,
      buttonProvider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'data-leakage.showButton',
      buttonHandler(buttonProvider, 'buttons'),
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'data-leakage.showSettings',
      buttonHandler(buttonProvider, 'settings'),
    ),
  );
}
