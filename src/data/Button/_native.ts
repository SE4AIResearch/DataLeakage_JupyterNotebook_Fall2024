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

function checkTerminalEnded(
  targetTerminal: vscode.Terminal,
  resolve: (value: unknown) => void,
  reject: (reason?: any) => void,
) {
  // Listen to terminal output
  const disposable = vscode.window.onDidEndTerminalShellExecution((e) => {
    if (e.terminal === targetTerminal) {
      disposable.dispose(); // Clean up the event listener

      if (e.exitCode === 0) {
        resolve(null);
      } else {
        reject(`Terminal exited with code ${e.exitCode}`);
      }
    }
  });
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
    console.log('HELLOOO');
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
  const outputDir = tempDir.getAlgoOutputDirPath();

  const command = `"${path.join(algoProgramDir, getOutputByOS(['main', 'main.exe', 'main']))}" "${pythonPath}" -o`;

  await runCommandWithPythonInterpreter(command);
}
