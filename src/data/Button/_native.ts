import * as vscode from 'vscode';
import * as path from 'path';
import { TempDir } from '../../helpers/TempDir';
import { checkTerminalEnded } from './_buttonUtils';

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

async function runCommandWithPythonInterpreter(command: string) {
  // Get the Python extension
  const pythonExtension = vscode.extensions.getExtension('ms-python.python');
  if (!pythonExtension) {
    vscode.window.showErrorMessage('Python extension is not installed.');
    return;
  }

  // Activate the Python extension
  await pythonExtension.activate();

  // Get the Python interpreter path
  const pythonPath =
    pythonExtension.exports.settings.getExecutionDetails().execCommand[0];

  // Create the full command
  const fullCommand = `${command}`;

  // Create a new terminal
  const terminal = vscode.window.createTerminal('Python Command Terminal');

  // Send the command to the terminal
  terminal.sendText(fullCommand);

  // Show the terminal
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
}

export async function runNative(
  context: vscode.ExtensionContext,
  tempDir: TempDir,
) {
  const algoProgramDir = await getPathToAlgoProgramDir(context);

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

  await runCommandWithPythonInterpreter(command);
}
