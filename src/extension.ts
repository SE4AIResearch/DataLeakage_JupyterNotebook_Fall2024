import * as vscode from 'vscode';
import Leakages from './Leakages/Leakages';
import { ButtonViewProvider } from './view/ButtonViewProvider';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'dataleakage-jupyternotebook-fall2024.runLeakageDetector',
    async () => {
      try {
        const leakages = new Leakages(
          'src/_output/PreprocessingLeakage/',
          context,
        ); // src/_output/PreprocessingLeakage/ is just the local path my outputs files
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
}

export function deactivate() {}
