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

// async function runCommandWithPythonInterpreter(command: string) {
//   // Get the Python extension
//   const pythonExtension = vscode.extensions.getExtension('ms-python.python');
//   if (!pythonExtension) {
//     vscode.window.showErrorMessage('Python extension is not installed.');
//     return;
//   }

//   // Activate the Python extension
//   await pythonExtension.activate();

//   // Get the Python interpreter path
//   const pythonPath =
//     pythonExtension.exports.settings.getExecutionDetails().execCommand[0];

//   // Create the full command
//   const fullCommand = `${command}`;

//   // Create a new terminal
//   const terminal = vscode.window.createTerminal('Python Command Terminal');

//   // Send the command to the terminal
//   terminal.sendText(fullCommand);

//   // Show the terminal
//   terminal.show();

//   try {
//     await new Promise((resolve, reject) => {
//       checkTerminalEnded(terminal, resolve, reject);
//     });
//   } catch (err) {
//     terminal.dispose();
//     throw err;
//   }
//   terminal.dispose();
// }

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
      close: true,
    };

    // Execute the task
    vscode.tasks.executeTask(task).then(
      (taskExecution) => {
        // Set up a listener for when the task process ends
        const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
          if (e.execution === taskExecution) {
            disposable.dispose();
            if (e.exitCode === 0) {
              resolve();
            } else {
              reject(
                new Error(`Python command failed with exit code ${e.exitCode}`),
              );
            }
          }
        });
      },
      (error) => {
        reject(error);
      },
    );
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
