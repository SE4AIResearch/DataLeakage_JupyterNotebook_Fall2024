import * as vscode from 'vscode';
import Docker, { ImageInfo } from 'dockerode';

import path from 'path';
import fs from 'fs';

import { TempDir } from '../../helpers/TempDir';
import { StateManager } from '../../helpers/StateManager';
import { ConversionToPython } from '../../helpers/conversion/LineConversion';
import LeakageInstance from '../Leakages/LeakageInstance/LeakageInstance';
import Leakages from '../Leakages/Leakages';
import { LineMapRecord } from '../../validation/isLineMapRecord';
import { runDocker } from './_docker';
import { runNative } from './_native';
import {
  LeakageAdapterCell,
  getAdaptersFromFile,
} from '../../helpers/Leakages/createLeakageAdapters';

// TODO: Refactor analyzeNotebook & analyzeNotebookWithNotification into one

// FIXME: Docker container still running even tho it shows analysis as completed. Example is nb_471253.ipynb

async function runAlgorithm(
  context: vscode.ExtensionContext,
  tempDir: TempDir,
  method: string,
) {
  if (method === "native"){
    console.log("native method was chosen");
    try {
      await runNative(context, tempDir);
    } catch (err) {
      vscode.window.showErrorMessage(
        'Native Implementation Failed. Falling back to Docker.',
      );
  
      try {
        await runDocker(tempDir);
      } catch (err) {
        vscode.window.showErrorMessage(
          'Docker Implementation Failed. Extension Exiting.',
        );
        throw err;
      }
    }
  }

  if (method === "docker"){
    console.log("docker method was chosen");
    try {
      await runDocker(tempDir);
    } catch (err) {
      vscode.window.showErrorMessage(
        'Docker Implementation Failed. Extension Exiting.',
      );
      throw err;
    }
  }
  
}

function transformInput(
  notebookFile: vscode.NotebookDocument,
): [string, LineMapRecord] {
  const conversionManager = new ConversionToPython(notebookFile);
  const lineNumberRecord = conversionManager.getLineMapRecord();
  const pythonStr = conversionManager.getPythonCode();
  return [pythonStr, lineNumberRecord];
}

async function analyzeNotebook(
  view: vscode.WebviewView,
  context: vscode.ExtensionContext,
  changeView: () => Promise<void>,
  method: string,
) {
  if (vscode.window.activeNotebookEditor === undefined) {
    vscode.window.showErrorMessage(
      'Please select an ipynb notebook in the editor for the algorithm to run.',
    );
    view.webview.postMessage({ type: 'analysisCompleted' });
    return;
  }

  if (
    vscode.window.activeNotebookEditor &&
    vscode.window.activeNotebookEditor.notebook.uri.scheme === 'file' &&
    path.extname(vscode.window.activeNotebookEditor.notebook.uri.fsPath) ===
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

      await runAlgorithm(context, tempDir, method);
      const elapsedTime = (performance.now() - startTime) / 1000;
      vscode.window.showInformationMessage(
        `Analysis completed in ${elapsedTime} second${elapsedTime === 1 ? '' : 's'}`,
      );

      try {
        await changeView();
      } catch (err) {
        console.error(err);
        console.error('Panel Table View not active.');
      }

      view.webview.postMessage({ type: 'analysisCompleted' });
      StateManager.saveIsRunning(context, false);
    } catch (err) {
      StateManager.saveIsRunning(context, false);
      view.webview.postMessage({ type: 'analysisCompleted' });
      vscode.window.showErrorMessage(
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
  changeView: () => Promise<void>,
  method: string,
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
          await analyzeNotebook(view, context, changeView, method);
        } catch (err) {
          console.error(err);
        }
        progress.report({ increment: 100 });
      })();
    },
  );
}
