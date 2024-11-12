import * as vscode from 'vscode';
import Docker, { ImageInfo } from 'dockerode';

import path from 'path';
import fs from 'fs';

import { DockerTemp, TempDir } from '../helpers/TempDir';
import { StateManager } from '../helpers/StateManager';
import { ConversionToPython } from '../helpers/conversion/LineConversion';
import LeakageInstance from './Leakages/LeakageInstance/LeakageInstance';
import Leakages from './Leakages/Leakages';

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

function transformInput(
  notebookFile: vscode.NotebookDocument,
): [string, Record<string, string>] {
  const conversionManager = new ConversionToPython(notebookFile);
  const lineNumberRecord = conversionManager.getLineMapRecord();
  const pythonStr = conversionManager.getPythonCode();
  return [pythonStr, lineNumberRecord];
}

// TODO: Refactor analyzeNotebook & analyzeNotebookWithNotification into one

async function analyzeNotebook(
  view: vscode.WebviewView,
  context: vscode.ExtensionContext,
  changeView: (leakages: LeakageInstance[]) => void,
) {
  if (
    vscode.window.activeNotebookEditor &&
    vscode.window.activeNotebookEditor?.notebook.uri.scheme === 'file' &&
    path.extname(vscode.window.activeNotebookEditor?.notebook.uri.fsPath) ===
      '.ipynb' &&
    StateManager.loadIsRunning(context) === false &&
    view
  ) {
    const startTime = performance.now();
    try {
      StateManager.saveIsRunning(context, true);

      // Convert Notebook -> Python
      const [pythonStr, jsonObj] = transformInput(
        vscode.window.activeNotebookEditor?.notebook,
      );

      // Write Python to Temp File

      const tempDir = new TempDir(pythonStr);

      fs.writeFileSync(tempDir.getAlgoInputFilePath(), pythonStr, {
        encoding: 'utf8',
        flag: 'w',
      });

      fs.writeFileSync(
        tempDir.getAlgoJupyLineMappingPath(),
        JSON.stringify(jsonObj, undefined, 2),
        {
          encoding: 'utf8',
          flag: 'w',
        },
      );

      console.log(`Input Directory is: ${tempDir.getAlgoDirPath()}`);
      console.log(`Input Python File is:\n${pythonStr}`);
      console.log(
        `Input JSON File is:\n${JSON.stringify(jsonObj, undefined, 2)}`,
      );

      // Save Temp Directory State

      StateManager.saveTempDirState(context, {
        ogFilePath: vscode.window.activeNotebookEditor?.notebook.uri.fsPath,
        tempDirPath: tempDir.getAlgoInputFilePath(),
      });

      // Run Algorithm & Wait for result

      await requestAlgorithm(tempDir);
      const elapsedTime = (performance.now() - startTime) / 1000;
      vscode.window.showInformationMessage(
        `Analysis completed in ${elapsedTime} second${elapsedTime === 1 ? '' : 's'}`,
      );

      const leakages = new Leakages(tempDir.getAlgoOutputDirPath(), context);
      const leakagesList = await leakages.getLeakages();
      changeView(leakagesList);

      view.webview.postMessage({ type: 'analysisCompleted' });
      StateManager.saveIsRunning(context, false);
    } catch (err) {
      StateManager.saveIsRunning(context, false);
      view.webview.postMessage({ type: 'analysisCompleted' });
      vscode.window.showInformationMessage(
        'Analysis Failed: Unknown Error Encountered.',
      );
      throw err;
    }
  } else {
    view.webview.postMessage({ type: 'analysisCompleted' });
  }
}

export async function analyzeNotebookWithProgress(
  view: vscode.WebviewView,
  context: vscode.ExtensionContext,
  changeView: (leakages: LeakageInstance[]) => void,
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
          await analyzeNotebook(view, context, changeView);
        } catch (err) {
          console.error(err);
        }
        progress.report({ increment: 100 });
      })();
    },
  );
}
