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

let pendingQuickFixPromiseResolve: ((value: string) => void) | null = null;

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

  // Command to handle quick fix decisions
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'data-leakage.handleQuickFixDecision',
      async (decision: string) => {
        // Resolve the pending promise when user makes a decision
        if (pendingQuickFixPromiseResolve) {
          pendingQuickFixPromiseResolve(
            decision === 'keep' ? 'Keep Changes' : 'Revert Changes',
          );
          pendingQuickFixPromiseResolve = null;
        }
      },
    ),
  );

  // Quick Fix action for data leakage
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'data-leakage.showFixDiff',
      async (
        documentUri: vscode.Uri,
        originalContent: string,
        leakageType: string,
      ) => {
        try {
          // Find notebook cell info
          const cellInfo =
            await quickFixManual.findNotebookCellInfo(documentUri);

          // Fetch original file's directory
          const tempDir = await TempDir.getTempDir(
            cellInfo ? cellInfo.notebook.uri.fsPath : documentUri.fsPath,
          );
          // Create both original and modified files for diff view
          const originalFile = vscode.Uri.file(
            path.join(tempDir.getAlgoDirPath(), 'original.py'),
          );
          const modifiedFile = vscode.Uri.file(
            path.join(tempDir.getAlgoDirPath(), 'modified.py'),
          );

          // Get current document content (after edit was applied)
          const document = await vscode.workspace.openTextDocument(documentUri);
          const modifiedContent = document.getText();

          // Write both files for the diff view
          await vscode.workspace.fs.writeFile(
            originalFile,
            Buffer.from(originalContent),
          );
          await vscode.workspace.fs.writeFile(
            modifiedFile,
            Buffer.from(modifiedContent),
          );

          // Create descriptive title for Quick Fix
          const title = cellInfo
            ? `Fix for ${leakageType} in Cell #${cellInfo.cellIndex}`
            : `Fix for ${leakageType}`;

          // Show notification to user about using the extension panel
          // to accept or reject Quick Fix changes.
          vscode.window.showInformationMessage(
            'Use the left extension sidebar to accept or reject changes.',
          );

          // Need ButtonView visible to properly show the Quick Fix dialog
          // before showing the diff.
          await vscode.commands.executeCommand(
            'data-leakage.buttonViewProvider.focus',
          );
          await vscode.commands.executeCommand(
            'vscode.diff',
            originalFile,
            modifiedFile,
            title,
          );

          // Tell ButtonView to show the quick fix dialog
          if (buttonProvider.webview) {
            buttonProvider.showQuickFixDialog();
          } else {
            // The webview is not ready yet, you could show an error or retry
            console.warn(
              'ButtonView webview is not ready for quick fix dialog.',
            );
          }

          // Create a promise that will be resolved when the user makes a decision
          const choice = await new Promise<string>((resolve) => {
            pendingQuickFixPromiseResolve = resolve;
          });

          // Hide the dialog once a decision is made
          if (buttonProvider.webview) {
            buttonProvider.hideQuickFixDialog();
          }

          // User chose to revert changes
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
            // User chose to keep changes
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
                  'Fixed multi-test leakage by using independent test data for evaluation.';
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

          // Clear the flag after the decision is made
          pendingQuickFixPromiseResolve = null;

          // Clean up temporary files
          try {
            await vscode.workspace.fs.delete(originalFile);
            await vscode.workspace.fs.delete(modifiedFile);
          } catch (err) {
            console.error('Failed to clean up temp files:', err);
          }
        } catch (error) {
          // Clear the flag in case of error
          pendingQuickFixPromiseResolve = null;
          // Hide Quick Fix dialog in case of error
          if (buttonProvider.webview) {
            buttonProvider.hideQuickFixDialog();
          }
          console.error(error);
          vscode.window.showErrorMessage(
            `Error showing fix diff: ${error instanceof Error ? error.message : String(error)}`,
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
