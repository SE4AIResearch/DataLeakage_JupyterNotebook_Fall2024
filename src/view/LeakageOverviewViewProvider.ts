import * as vscode from 'vscode';

import { getNonce, getWebviewOptions } from '../helpers/utils';
import {
  getAdaptersFromFile,
  LeakageAdapterCell,
} from '../helpers/Leakages/createLeakageAdapters';

export type Row = {
  type: string;
  line: number;
  variable: string;
  cause: string;
};

/**
 * Manages Leakage Summary Webview
 */
export class LeakageOverviewViewProvider {
  public static readonly viewType = 'data-leakage.overviewViewProvider';

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

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case 'webviewLoaded':
          this.updateTables();
        default:
          throw 'Error: unrecognized data type';
      }
    });
  }

  // Functions called outside the class to dynamically change leakage count

  public async updateTables() {
    try {
      if (vscode.window.activeNotebookEditor) {
        const adapters = await getAdaptersFromFile(
          this._context,
          vscode.window.activeNotebookEditor.notebook.uri.fsPath,
        );
        this._updateTables(adapters);
      } else {
        this._updateTables(null);
      }
    } catch (err) {
      console.log('Notebook has potentially never been analyzed before.');
      console.error(err);
    }
  }

  private _updateTables(adapters: LeakageAdapterCell[] | null) {
    if (adapters === null) {
      this.changeCount(0, 0, 0);
      this.addRows([]); // Clear the table when there are no adapters
    } else {
      const overlapCount = adapters.filter(
        (adapter) => adapter.type === 'Overlap',
      ).length;
      const preprocessingCount = adapters.filter(
        (adapter) => adapter.type === 'Preprocessing',
      ).length;
      const multiTestCount = adapters.filter(
        (adapter) => adapter.type === 'Multi-Test',
      ).length;
      this.changeCount(preprocessingCount, multiTestCount, overlapCount);

      // Call addRows to update the Leakage Instances table
      // Transform adapters to Row[] format
      // TODO: should we write this elsewhere? And include cell number? I see LeakageAdapterCell in createLeakageAdapters.ts
      const rows: Row[] = adapters.map((adapter) => ({
        type: adapter.type,
        line: adapter.line,
        variable: adapter.variable,
        cause: adapter.cause,
      }));
      this.addRows(rows);
    }
  }

  // Private Helper Function

  public changeCount(
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

  // Functions called outside the class to add rows
  public async addRows(rows: Row[]) {
    // TODO: Add rows
    if (this._view) {
      this._view.webview.postMessage({
        type: 'addRows',
        rows: rows,
      });
    } else {
      throw new Error("View wasn't created.");
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'leakage_overview',
        'main.js',
      ),
    );

    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'leakage_overview',
        'reset.css',
      ),
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'leakage_overview',
        'vscode.css',
      ),
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'leakage_overview',
        'main.css',
      ),
    );

    const stylePriorityUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'leakage_overview',
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

				<title>Data Overview</title>
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
          <td id='preprocess'>0</td>
        </tr>
        <tr>
          <td>Multi-Test</td>
          <td id='multitest'>0</td>
        </tr>
        <tr>
          <td>Overlap</td>
          <td id='overlap'>0</td>
        </tr>
      </table>

      <h1>Leakage Instances</h1>
      <table id="leakage-instances-table">
        <tr>
          <th>Type</th>
          <th>Line</th>
          <th>Variable</th>
          <th>Cause</th>
        </tr>
        <!-- Rows will be added here dynamically -->
      </table>
        
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
