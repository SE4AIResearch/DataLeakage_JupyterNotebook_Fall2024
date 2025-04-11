import * as vscode from 'vscode';

import { getNonce, getWebviewOptions } from '../../helpers/utils';
import {
  getAdaptersFromFile,
  getCounts,
  LeakageAdapterCell,
} from '../../helpers/Leakages/createLeakageAdapters';
import { goToLeakageLine } from '../../data/Table/table';
import { isRow, Row } from '../../validation/table';
import { LeakageType } from '../../data/Leakages/types';
import { createMainPage } from './page/main/content';

// TODO: Convert into content.ts and layout.ts like ButtonViewProvider

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
          throw new Error('Error: unrecognized data type');
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
          id: adapter.displayId,
          gid: adapter.displayGid,
          type: adapter.displayType,
          cause: adapter.displayCause,
          cell: adapter.displayCell,
          line: adapter.displayLine,
          model: adapter.displayModel,
          variable: adapter.displayVariable,
          method: adapter.displayMethod,
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
    const isLightMode =
      vscode.window.activeColorTheme.kind !== 2 &&
      vscode.window.activeColorTheme.kind !== 3;

    const colorMode: 'light' | 'dark' = isLightMode ? 'light' : 'dark';

    return createMainPage(webview, this._extensionUri, colorMode);
  }
}
