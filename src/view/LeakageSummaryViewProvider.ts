import * as vscode from 'vscode';

import { getNonce, getWebviewOptions } from '../helpers/utils';

/**
 * Manages Leakage Summary Webview
 */
export class LeakageSummaryViewProvider {
  public static readonly viewType = 'data-leakage.leakageSummaryViewProvider';

  private _isRunning: Boolean = false;

  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
  ) {}

  // Main Function Called

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = getWebviewOptions(this._extensionUri);

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // webviewView.webview.onDidReceiveMessage((data) => {
    // switch (data.type) {
    // default:
    // 	throw "Error: unrecognized data type";
    // }
    // });
  }

  // Functions called outside the class to dynamically change leakage count
  public async changeCount(
    preprocessing: number,
    multiTest: number,
    overlap: number,
  ) {
		if (this._view) {
			this._view.webview.postMessage({
				type: 'changeCount',
				preprocessing: preprocessing,
				multiTest: multiTest,
				overlap: overlap,
			});
		} else {
			throw new Error("View wasn't created.");
		}
  }

  // Private Helper Function

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'leakage_summary',
        'main.js',
      ),
    );

    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'leakage_summary',
        'reset.css',
      ),
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'leakage_summary',
        'vscode.css',
      ),
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'leakage_summary',
        'main.css',
      ),
    );

    const stylePriorityUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'leakage_summary',
        'prio.css',
      ),
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
				<meta http-equiv="Content-Security-Policy" content="default-src 'none';
				style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<link href="${stylePriorityUri}" rel="stylesheet">

				<title>Data Leakage</title>
			</head>
			<body>
				<h1>Leakage Summary</h1>
      <table>
        <tr>
          <th>Type</th>
          <th>Leakage Count</th>
        </tr>
        <tr>
          <td>Pre-Processing</td>
          <td id='preprocess'>-1</td>
        </tr>
        <tr>
          <td>Multi-Test</td>
          <td id='multitest'>-1</td>
        </tr>
        <tr>
          <td>Overlap</td>
          <td id='overlap'>-1</td>
        </tr>
      </table>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
