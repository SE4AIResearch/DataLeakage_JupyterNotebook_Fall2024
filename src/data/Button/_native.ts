import * as vscode from 'vscode';
import * as path from 'path';
import { TempDir } from '../../helpers/TempDir';

async function getPathToAlgoProgramDir(
  context: vscode.ExtensionContext,
): Promise<string> {
  const globalStoragePath = context.globalStorageUri.fsPath;
  console.log(globalStoragePath);

  return path.join(globalStoragePath, 'main');
}

/**
 * Given input, where the first element is for MacOS, second element is for Windows, third element is for Linux.
 */
function getOutputByOS(input: [any, any, any]) {
  if (process.platform === 'darwin') {
    return input[0];
  } else if (process.platform === 'win32') {
    return input[1];
  } else {
    return input[2];
  }
}

async function runPythonCommandAsTask(command: string): Promise<void> {
  // Get the Python extension
  const pythonExtension = vscode.extensions.getExtension('ms-python.python');
  if (!pythonExtension) {
    throw new Error('Python extension is not installed.');
  }

  // Activate the Python extension
  await pythonExtension.activate();

  // Get the Python interpreter path
  const pythonPath =
    pythonExtension.exports.settings.getExecutionDetails().execCommand[0];

  // Create the full command with Python interpreter
  const fullCommand = `${command}`;

  return new Promise<void>((resolve, reject) => {
    // Create the task
    const task = new vscode.Task(
      { type: 'native' },
      vscode.TaskScope.Workspace,
      'Run native binary',
      'Leakage Detector',
      new vscode.ShellExecution(fullCommand),
      ['$python'], // Use Python problem matcher
    );

    task.presentationOptions = {
      reveal: vscode.TaskRevealKind.Always,
      panel: vscode.TaskPanelKind.Shared,
      close: true,
    };

    // Execute the task
    vscode.tasks.executeTask(task).then((taskExecution) => {
      // Set up a listener for when the task process ends
      const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
        if (e.execution === taskExecution) {
          disposable.dispose();

          if (e.exitCode === 0) {
            console.log('Successfully ran native binary.');
            resolve();
          } else {
            reject(
              new Error(`Python command failed with exit code ${e.exitCode}`),
            );
            const idx = vscode.window.terminals
              .map((terminal) => {
                return terminal.creationOptions.name;
              })
              .findIndex((val) => val === e.execution.task.name);

            if (idx === -1) {
              console.error('Created terminal not found');
            } else {
              vscode.window.terminals[idx].dispose();
            }
          }
        }
      });
    });
  });
}

export async function runNative(
  context: vscode.ExtensionContext,
  tempDir: TempDir,
) {
  const algoProgramDir = await getPathToAlgoProgramDir(context);
  console.log(algoProgramDir);

  const pythonPath = tempDir.getAlgoInputFilePath();

  const cleanFn = getOutputByOS([
    (inp: string) => inp.replaceAll(' ', '\\ '),
    (inp: string) => inp,
    (inp: string) => inp.replaceAll(' ', '\\ '),
  ]);

  const programBinaryPath = cleanFn(
    `${path.join(algoProgramDir, getOutputByOS(['main', 'main.exe', 'main']))}`,
  );

  const command = `${programBinaryPath} ${pythonPath} -o`;

  await runPythonCommandAsTask(command);
}
