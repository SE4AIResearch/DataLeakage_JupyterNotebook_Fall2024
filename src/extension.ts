import fs from 'fs';

import * as vscode from 'vscode';
import Docker, { ContainerInfo, ImageInfo } from 'dockerode';

import {
  ALGO_CONTAINER_DIR_PATH,
  ALGO_HOST_DIR_PATH,
  getAlgoInputFilePath,
  IMAGE_NAME,
} from './helpers/utils';
import path from 'path';

function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new ButtonViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ButtonViewProvider.viewType,
      provider,
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('data-leakage.analyzeNotebook', () => {
      provider.analyzeNotebook();
    }),
  );
}

export function deactivate() {}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    // Enable javascript in the webview
    enableScripts: true,

    // And restrict the webview to only loading content from our extension's `media` directory.
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
  };
}

/**
 * Manages Button Webview
 */
class ButtonViewProvider {
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
          this.analyzeNotebook();
          break;
      }
    });
  }

  private async _ensureImageExist(docker: Docker, imageName: string) {
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
        console.log(imageRes);
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  public async analyzeNotebook() {
    if (
      vscode.window.activeNotebookEditor &&
      vscode.window.activeNotebookEditor?.notebook.uri.scheme === 'file' &&
      path.extname(vscode.window.activeNotebookEditor?.notebook.uri.fsPath) ===
        '.ipynb' &&
      this._isRunning === false
    ) {
      this._isRunning = true;

      const fileData = vscode.window.activeNotebookEditor?.notebook
        .getCells()
        .filter((cell) => cell.kind === 2);

      const pythonFileData = fileData
        .map((cell) => cell.document.getText())
        .join('\n');

      const docker = new Docker();
      await this._ensureImageExist(docker, IMAGE_NAME);

      console.log(ALGO_HOST_DIR_PATH);
      console.log(ALGO_CONTAINER_DIR_PATH);

      fs.writeFileSync(
        getAlgoInputFilePath(ALGO_HOST_DIR_PATH),
        pythonFileData,
        {
          encoding: 'utf8',
          flag: 'w',
        },
      );

      const result = await docker.run(
        IMAGE_NAME,
        [`${getAlgoInputFilePath(ALGO_CONTAINER_DIR_PATH)}`, `-o`],
        process.stdout,
        {
          HostConfig: {
            Binds: [`${ALGO_HOST_DIR_PATH}:${ALGO_CONTAINER_DIR_PATH}`],
          },
        },
      );
      console.log(result);
      this._isRunning = false;
    }
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
