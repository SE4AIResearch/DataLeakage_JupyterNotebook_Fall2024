import * as vscode from 'vscode';
import * as path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';

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

/**
 * Check Conda or Venv
 */
function isConda(interpreterPath: string) {
  const parentDir = path.dirname(interpreterPath);
  const grandparentDir = path.dirname(parentDir);
  // check if grandparentDir/parentDir includes conda-meta folder
  if (
    fs.existsSync(path.join(grandparentDir, 'conda-meta')) ||
    fs.existsSync(path.join(parentDir, 'conda-meta'))
  ) {
    return true;
  } else {
    return false;
  }
}

function getEnvPath(interpreterPath: string) {
  const parentDir = path.dirname(interpreterPath);
  const grandparentDir = path.dirname(parentDir);
  console.log('Interpreter Parent Directory: ', parentDir);
  console.log('Interpreter Grandparent Directory: ', grandparentDir);

  if (isConda(interpreterPath)) {
    const rootDir = fs.existsSync(path.join(parentDir, 'conda-meta'))
      ? parentDir
      : grandparentDir;
    return rootDir;
  } else {
    return path.join(
      parentDir,
      process.platform === 'win32' ? 'Activate.ps1' : 'activate',
    );
  }
}

async function runCommandWithPythonInterpreter(command: string) {
  // Get the Python extension
  const pythonExtension = vscode.extensions.getExtension('ms-python.python');
  if (!pythonExtension) {
    vscode.window.showErrorMessage('Python extension is not installed.');
    return;
  }
  await pythonExtension.activate();

  const pythonPath =
    pythonExtension.exports.settings.getExecutionDetails().execCommand[0];

  const envPath = getEnvPath(pythonPath);

  console.log(pythonPath);
  console.log('Is it running Conda: ', isConda(pythonPath));

  const shellCommand = `
${
  isConda(pythonPath)
    ? `
conda init ${process.platform === 'win32' ? 'powershell.exe' : process.platform === 'darwin' ? 'zsh' : 'bash'}
${process.platform === 'win32' ? `conda activate ${envPath}` : `source activate ${envPath}`}
      `
    : process.platform === 'win32'
      ? `${envPath}`
      : `source ${envPath}`
}
${command}
  `;

  try {
    console.log(
      'Going to try exec now with the following command: \n',
      shellCommand,
    );
    await new Promise((resolve, reject) => {
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const shellFlag = process.platform === 'win32' ? '/c' : '-c';
      console.log(shell, shellFlag);
      const child = spawn(shell, [
        shellFlag,
        process.platform === 'win32'
          ? shellCommand.trim().replace(/\\/g, '\\\\')
          : shellCommand.trim(),
      ]);

      let stdout = '';
      let stderr = '';

      // Collect stdout data
      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`stdout: ${output}`);
      });

      // Collect stderr data
      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`stderr: ${output}`);
      });

      // Handle process completion
      child.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with exit code ${code}\n${stderr}`));
        }
      });

      // Handle process errors
      child.on('error', (err) => {
        reject(new Error(`Failed to start process: ${err.message}`));
      });
    });
  } catch (err) {
    throw err;
  }
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
