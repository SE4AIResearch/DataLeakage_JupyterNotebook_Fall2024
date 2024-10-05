import fs from 'fs';
import path from 'path';

import * as vscode from 'vscode';

import {
  ALGO_HOST_DIR_PATH,
  getAlgoInputFilePath,
  getNonce,
  getWebviewOptions,
} from '../helpers/utils';
import { getNotebookInNormalFormat, requestAlgorithm } from '../data/button';

/**
 * Manages Button Webview
 */
export class ButtonViewProvider {
  public static readonly viewType = 'data-leakage.buttonView';

  private _isRunning: Boolean = false;

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = getWebviewOptions(this._extensionUri);

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case 'analyzeNotebook':
          this.analyzeNotebookWithNotification();
          break;
      }
    });
  }

  public async analyzeNotebook() {
    if (
      vscode.window.activeNotebookEditor &&
      vscode.window.activeNotebookEditor?.notebook.uri.scheme === 'file' &&
      path.extname(vscode.window.activeNotebookEditor?.notebook.uri.fsPath) ===
        '.ipynb' &&
      this._isRunning === false &&
      this._view
    ) {
      this._isRunning = true;

      // Convert Notebook -> Python

      const pythonStr = getNotebookInNormalFormat(
        vscode.window.activeNotebookEditor?.notebook,
      );

      console.log(`Input Directory is: ${ALGO_HOST_DIR_PATH}`);
      console.log(`Input Python File is:\n${pythonStr}`);

      fs.writeFileSync(getAlgoInputFilePath(ALGO_HOST_DIR_PATH), pythonStr, {
        encoding: 'utf8',
        flag: 'w',
      });

      // Run Algorithm & Wait for result

      await requestAlgorithm();

      this._view.webview.postMessage({ type: 'analysisCompleted' });
      this._isRunning = false;
    }
  }

  public analyzeNotebookWithNotification() {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: 'Analyzing Notebook',
      },
      async (progress) => {
        return new Promise<void>((resolve) => {
          (async () => {
            progress.report({ increment: 0 });
            await this.analyzeNotebook();
            resolve();
            progress.report({ increment: 100 });
          })();
        });
      },
    );
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'button', 'main.js'),
    );

    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'button', 'reset.css'),
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'button', 'vscode.css'),
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'button', 'main.css'),
    );

    const nonce = getNonce();
    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Data Leakage</title>
			</head>
			<body>

				<button class="button">Analyze File</button>

        <script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
