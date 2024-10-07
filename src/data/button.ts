import * as vscode from 'vscode';

import Docker, { ImageInfo } from 'dockerode';
import { CellConversion } from '../helpers/CellConversion';
import { DockerTemp, TempDir } from '../helpers/TempDir';
import path from 'path';
import fs from 'fs';

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

async function analyzeNotebook(view: vscode.WebviewView) {
  if (
    vscode.window.activeNotebookEditor &&
    vscode.window.activeNotebookEditor?.notebook.uri.scheme === 'file' &&
    path.extname(vscode.window.activeNotebookEditor?.notebook.uri.fsPath) ===
      '.ipynb' &&
    _isRunning === false &&
    view
  ) {
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

    console.log(`Input Directory is: ${tempDir.getAlgoDirPath()}`);
    console.log(`Input Python File is:\n${pythonStr}`);

    // Run Algorithm & Wait for result

    await requestAlgorithm(tempDir);

    view.webview.postMessage({ type: 'analysisCompleted' });
    _isRunning = false;
  }
}

export async function analyzeNotebookWithNotification(
  view: vscode.WebviewView,
) {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: 'Analyzing Notebook',
    },
    async (progress) => {
      return new Promise<void>((resolve) => {
        (async () => {
          progress.report({ increment: 0 });
          await analyzeNotebook(view);
          resolve();
          progress.report({ increment: 100 });
        })();
      });
    },
  );
}
