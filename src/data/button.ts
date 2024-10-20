import * as vscode from 'vscode';

import Docker, { ImageInfo } from 'dockerode';
import { CellConversion } from '../helpers/CellConversion';
import { DockerTemp, TempDir } from '../helpers/TempDir';
import path from 'path';
import fs from 'fs';
import { StateManager } from '../helpers/StateManager';

let _isRunning = false;

async function ensureImageExist(docker: Docker, imageName: string) {
  try {
    const images: ImageInfo[] = await docker.listImages();

    const getImage = async () =>
      images.find((image) => image.RepoTags?.includes(`${imageName}:latest`));

    if (!(await getImage())) {
      const imageRes = await new Promise((resolve, reject) => {
        docker.pull(imageName, (pullError: any, pullStream: any) => {
          if (pullError) {
            reject(pullError);
          }
          docker.modem.followProgress(
            pullStream,
            (progressError: any, output: any) => {
              if (progressError) {
                reject(progressError);
              } else {
                resolve(output);
                return;
              }
            },
          );
        });
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}

// TODO: Maybe refactor this into cellConversion
function getNotebookInNormalFormat(
  notebookFile: vscode.NotebookDocument,
): string {
  const cellConversion = new CellConversion();

  const codeCellsWithIndex: [string, number][] = notebookFile
    .getCells()
    .map((cell, i): [vscode.NotebookCell, number] => [cell, i])
    .filter(([cell]) => cell.kind === 2)
    .map(([cell, i]) => [cell.document.getText(), i]);

  return cellConversion.insertCellIndices(codeCellsWithIndex)[1];
}

async function requestAlgorithm(tempDir: TempDir) {
  const docker = new Docker();
  await ensureImageExist(docker, DockerTemp.IMAGE_NAME);

  const timeout = new Promise((res) =>
    setTimeout(() => res('Timed out'), 20000),
  );

  const result = await Promise.race([
    docker.run(
      DockerTemp.IMAGE_NAME,
      [`${DockerTemp.PYTHON_FILE_PATH}`, `-o`],
      process.stdout,
      {
        HostConfig: {
          Binds: [
            `${tempDir.getAlgoDirPath()}:${DockerTemp.CONTAINER_DIR_PATH}`,
          ],
        },
      },
    ),
    timeout,
  ]);
}

// TODO: Refactor analyzeNotebook & analyzeNotebookWithNotification into one

async function analyzeNotebook(
  view: vscode.WebviewView,
  context: vscode.ExtensionContext,
) {
  if (
    vscode.window.activeNotebookEditor &&
    vscode.window.activeNotebookEditor?.notebook.uri.scheme === 'file' &&
    path.extname(vscode.window.activeNotebookEditor?.notebook.uri.fsPath) ===
      '.ipynb' &&
    _isRunning === false &&
    view
  ) {
    const startTime = performance.now();
    try {
      _isRunning = true;

      // Convert Notebook -> Python

      const pythonStr = getNotebookInNormalFormat(
        vscode.window.activeNotebookEditor?.notebook,
      );

      const tempDir = new TempDir(pythonStr);

      fs.writeFileSync(tempDir.getAlgoInputFilePath(), pythonStr, {
        encoding: 'utf8',
        flag: 'w',
      });

      StateManager.saveTempDirState(context, {
        ogFilePath: vscode.window.activeNotebookEditor?.notebook.uri.fsPath,
        tempDirPath: tempDir.getAlgoInputFilePath(),
      });

      console.log(`Input Directory is: ${tempDir.getAlgoDirPath()}`);
      console.log(`Input Python File is:\n${pythonStr}`);

      // Run Algorithm & Wait for result

      await requestAlgorithm(tempDir);
      const elapsedTime = (performance.now() - startTime) / 1000;
      vscode.window.showInformationMessage(
        `Analysis completed in ${elapsedTime} second${elapsedTime === 1 ? '' : 's'}`,
      );
      view.webview.postMessage({ type: 'analysisCompleted' });
      _isRunning = false;
    } catch (err) {
      _isRunning = false;
      view.webview.postMessage({ type: 'analysisCompleted' });
      vscode.window.showInformationMessage(
        'Analysis Failed: Unknown Error Encountered.',
      );
      throw err;
    }
  }
}

export async function analyzeNotebookWithProgress(
  view: vscode.WebviewView,
  context: vscode.ExtensionContext,
) {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: 'Analyzing Notebook',
    },
    async (progress) => {
      return (async () => {
        progress.report({ increment: 0 });
        try {
          await analyzeNotebook(view, context);
        } catch (err) {
          console.error(err);
        }
        progress.report({ increment: 100 });
      })();
    },
  );
}
