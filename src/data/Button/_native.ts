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
  // Create a new terminal
  const terminal = vscode.window.createTerminal('Python Command Terminal');
  // Show the terminal
  terminal.show();

  // Activate the .venv virtual environment for Windows
  if (process.platform === 'win32') {
    // Want to manually activate venv
    // Get ${pathToPythonFolder}/Scripts/Activate.ps1
    const pythonPath = pythonExtension.exports.settings.getExecutionDetails().execCommand[0];
    const pythonFolder = path.dirname(pythonPath);
    const activatePath = path.join(pythonFolder, 'Activate.ps1');
    console.log(`python folder path is ${pythonFolder}`);
    console.log(`activate path is ${activatePath}`);
    // Activate the virtual environment
    terminal.sendText(`& ${activatePath}`);
  }
  // Activate the Python extension
  await pythonExtension.activate();

  // Create the full command
  const fullCommand = `${command}`;
  // Send the command to the terminal
  terminal.sendText(fullCommand);

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

  await runCommandWithPythonInterpreter(command);
}
