import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';

// TODO: convert to Task API

function checkTerminalEnded(
  targetTerminal: vscode.Terminal,
  resolve: (value: unknown) => void,
  reject: (reason?: any) => void,
) {
  // Listen to terminal output
  const disposable = vscode.window.onDidEndTerminalShellExecution((e) => {
    if (e.terminal === targetTerminal) {
      disposable.dispose(); // Clean up the event listener

      console.log(e.exitCode, targetTerminal.exitStatus);

      if (e.exitCode === 0) {
        resolve(null);
      } else {
        reject(`Terminal exited with code ${e.exitCode}`);
      }
    } else {
      console.log('Listening to the wrong terminal. Proceeding to skip.');
    }
  });
}

export async function installLeakageFolder(
  context: vscode.ExtensionContext,
  leakageFolder: vscode.Uri[],
): Promise<void> {
  const globalStoragePath = context.globalStorageUri.fsPath;
  const sourceFolderPath = leakageFolder[0].fsPath;

  console.log(globalStoragePath);

  try {
    await fs.ensureDir(globalStoragePath);
    await fs.copy(sourceFolderPath, globalStoragePath);

    console.log('Leakage program successfully copied!');
  } catch (err) {
    console.error('Error copying leakage program:', err);
    vscode.window.showErrorMessage('Error copying leakage program');
  }

  try {
    const pyrightDir = path.join(
      globalStoragePath,
      'main',
      '_internal',
      'pyright',
    );

    const terminal = vscode.window.createTerminal({
      name: 'Pyright Install',
      cwd: pyrightDir,
    });

    terminal.sendText('npm install pyright-1.1.188.tgz');
    terminal.show();

    try {
      await new Promise((resolve, reject) => {
        checkTerminalEnded(terminal, resolve, reject);
      });
    } catch (err) {
      terminal.dispose();
      throw err;
    }
    terminal.dispose();

    console.log('Pyright successfully installed!');
    vscode.window.showInformationMessage(
      'Leakage program successfully installed!',
    );
  } catch (err) {
    console.error('Error installing Pyright:', err);
    vscode.window.showErrorMessage('Error installing Pyright module');
    await fs.rmdir(globalStoragePath, { recursive: true });
  }
}
