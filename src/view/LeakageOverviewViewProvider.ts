import * as vscode from 'vscode';

import { getNonce, getWebviewOptions } from '../helpers/utils';
import {
  getAdaptersFromFile,
  getCounts,
  LeakageAdapterCell,
} from '../helpers/Leakages/createLeakageAdapters';
import { goToLeakageLine } from '../data/Table/table';
import { isRow, Row } from '../validation/table';
import { LeakageType } from '../data/Leakages/types';

/**
 * Manages Leakage Overview Webview
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
        case 'moveCursor':
          console.log('Clicked', isRow(data.row), data.row);
          isRow(data.row) && goToLeakageLine(data.row);
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
        const counts = await getCounts(
          vscode.window.activeNotebookEditor.notebook.uri.fsPath,
        );
        this.changeCount(
          counts.preprocessingCount,
          counts.overlapCount,
          counts.multiTestCount,
        );

        // Call changeRows to update the Leakage Instances table
        // Transform adapters to Row[] format
        const rows: Row[] = adapters.map((adapter) => ({
          id: adapter.id,
          relationId: adapter.relationId,
          type: adapter.displayType,
          cause: adapter.cause,
          cell: adapter.cell,
          line: adapter.line,
          model: adapter.model,
          variable: adapter.variable,
          method: adapter.method,
        }));
        this.changeRows(rows);
      } else {
        this.changeCount();
        this.changeRows([]); // Clear the table when there are no adapters
      }
    } catch (err) {
      this.changeCount();
      this.changeRows([]); // Clear the table when there are no adapters
      console.log('Notebook has potentially never been analyzed before.');
      console.error(err);
    }
  }

  private changeCount(
    preprocessingCount: number = 0,
    overlapCount: number = 0,
    multiTestCount: number = 0,
  ) {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'changeCount',
        preprocessingCount,
        overlapCount,
        multiTestCount,
      });
    } else {
      throw new Error("View wasn't created.");
    }
  }

  // Functions called outside the class to add rows
  private async changeRows(rows: Row[]) {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'changeRows',
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
          <th>Unique Leakage Count</th>
        </tr>
        <tr>
          <td>Pre-Processing</td>
          <td id='preprocess'>0</td>
        </tr>
        <tr>
          <td>Overlap</td>
          <td id='overlap'>0</td>
        </tr>
        <tr>
          <td>Multi-Test</td>
          <td id='multitest'>0</td>
        </tr>
      </table>

      <h1>Leakage Instances</h1>
      <table id="leakage-instances-table">
        <tr>
          <th>Type</th>
          <th>Cell</th>
          <th>Line</th>
          <th>Model Variable Name</th>
          <th>Data Variable Name</th>
          <th>Method</th>
        </tr>
        <!-- Rows will be added here dynamically -->
      </table>
        
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
