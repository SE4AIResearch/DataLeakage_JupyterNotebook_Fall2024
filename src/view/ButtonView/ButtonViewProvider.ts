import os from 'os';

import * as vscode from 'vscode';

import { getWebviewOptions } from '../../helpers/utils';
import { analyzeNotebookWithProgress } from '../../data/Button/button';
import { StateManager } from '../../helpers/StateManager';
import { installLeakageFolder } from '../../data/Button/LeakageProgramInstaller';

import { createMainPage } from './page/main/content';
import { createSettingsPage } from './page/settings/content';
import { QuickFixManual } from '../../data/Diagnostics/quickFixManual';
import { configureNotebookDiagnostics } from '../../data/Diagnostics/notebookDiagnostics';

/**
 * Manages Button Webview
 */
export class ButtonViewProvider {
  public static readonly viewType = 'data-leakage.buttonViewProvider';

  // Using this to show Quick Fix debug info (due to syntax error)
  private static _outputDebugChannel: vscode.OutputChannel | undefined;
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
    private readonly _changeView: () => Promise<void>,
    private readonly _output: 'buttons' | 'settings',
    private readonly _notebookDiagnostics: vscode.DiagnosticCollection,
    private readonly _quickFixManual: QuickFixManual,
  ) {
    if (!ButtonViewProvider._outputDebugChannel) {
      ButtonViewProvider._outputDebugChannel =
        vscode.window.createOutputChannel('Data Analysis Debug');
    }
  }

  // Static getter for the output channel
  public static getOutputDebugChannel(): vscode.OutputChannel {
    if (!ButtonViewProvider._outputDebugChannel) {
      ButtonViewProvider._outputDebugChannel =
        vscode.window.createOutputChannel('Data Analysis Debug');
    }
    return ButtonViewProvider._outputDebugChannel;
  }

  // Static method to clear the output channel
  public static clearOutputDebugChannel(): void {
    if (ButtonViewProvider._outputDebugChannel) {
      ButtonViewProvider._outputDebugChannel.clear();
      ButtonViewProvider._outputDebugChannel.hide();
    }
  }

  public showQuickFixDialog() {
    if (this._view) {
      // First ensure we're on the main page
      this.refresh('buttons');
      // Show the dialog and disable the run buttons
      this._view.webview.postMessage({
        type: 'showQuickFixDialog',
      });
    }
  }

  public hideQuickFixDialog() {
    if (this._view) {
      // Hide the dialog and enable the run buttons
      this._view.webview.postMessage({
        type: 'hideQuickFixDialog',
      });
    }
  }

  // Add this getter to access the webview
  public get webview(): vscode.Webview | undefined {
    return this._view?.webview;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = getWebviewOptions(this._extensionUri);

    webviewView.webview.html = this._getHtmlForWebview(
      webviewView.webview,
      this._output,
    );

    webviewView.webview.onDidReceiveMessage(async (data) => {
      console.log('Message Received From View: ', data.type);
      switch (data.type) {
        case 'analyzeNotebookNative':
          this._notebookDiagnostics.clear();
          await this.analyzeNotebookNative();
          if (vscode.window.activeTextEditor) {
            await configureNotebookDiagnostics(
              this._context,
              vscode.window.activeTextEditor,
              this._notebookDiagnostics,
              this._quickFixManual,
            );
          }
          break;
        case 'analyzeNotebookDocker':
          this._notebookDiagnostics.clear();
          await this.analyzeNotebookDocker();
          if (vscode.window.activeTextEditor) {
            await configureNotebookDiagnostics(
              this._context,
              vscode.window.activeTextEditor,
              this._notebookDiagnostics,
              this._quickFixManual,
            );
          }
          break;
        case 'quickFixDecision':
          // Forward the decision to the extension
          vscode.commands.executeCommand(
            'data-leakage.handleQuickFixDecision',
            data.decision,
          );
          break;
        case 'goToSettingsPage':
          this.refresh('settings');
          break;
        case 'webviewLoaded':
          try {
            // First check if a quick fix is in progress
            // if (isQuickFixInProgress) {
            //   this.showQuickFixDialog();
            // }
            const data = {
              type: 'webviewLoaded',
              isRunning: StateManager.loadIsRunning(this._context),
            };
            this._view?.webview.postMessage(data);
          } catch (error) {
            console.error(error);
            this._view?.webview.postMessage({
              type: 'webviewLoaded',
              isRunning: false,
            });
          }
          break;
        case 'openFilePicker':
          try {
            const leakageFolderUri = await vscode.window.showOpenDialog({
              canSelectMany: false,
              canSelectFiles: false,
              canSelectFolders: true,
              openLabel: 'Select Leakage Analysis Program Folder',
            });

            if (leakageFolderUri && leakageFolderUri[0]) {
              await installLeakageFolder(this._context, leakageFolderUri);
            }
          } catch (error) {
            console.error(error);
          }
          this._view?.webview.postMessage({
            type: 'filePickerDone',
            isRunning: StateManager.loadIsRunning(this._context),
          });
          break;
        case 'dockerChosen':
          StateManager.saveData(this._context, 'method', 'docker');
          this.refresh('settings');
          break;
        case 'nativeChosen':
          StateManager.saveData(this._context, 'method', 'native');
          console.log(
            'Native state should have been loaded: ',
            StateManager.loadData(this._context, 'method'),
          );
          this.refresh('settings');
          break;
      }
    });
  }

  public async refresh(output: 'buttons' | 'settings') {
    try {
      if (this._view) {
        this._view.webview.html = this._getHtmlForWebview(
          this._view?.webview,
          output,
        );
      } else {
        throw new Error("View wasn't created.");
      }
      const test2 = StateManager.loadData(this._context, 'method');
      console.log(test2);
    } catch (err) {
      console.log(err);
    }
  }

  public async analyzeNotebookNative() {
    console.log('native method was chosen');
    if (this._view) {
      await analyzeNotebookWithProgress(
        this._view,
        this._context,
        this._changeView,
        'native',
      );
    } else {
      throw new Error("View wasn't created.");
    }
  }

  public async analyzeNotebookDocker() {
    console.log('docker method was chosen');
    if (this._view) {
      await analyzeNotebookWithProgress(
        this._view,
        this._context,
        this._changeView,
        'docker',
      );
    } else {
      throw new Error("View wasn't created.");
    }
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    output: 'buttons' | 'settings',
  ) {
    StateManager.saveIsRunning(this._context, false);

    const isLightMode =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ||
      vscode.window.activeColorTheme.kind ===
        vscode.ColorThemeKind.HighContrastLight;

    console.log('Theme: ', vscode.window.activeColorTheme.kind, isLightMode);

    const iconLink = isLightMode
      ? 'https://cdn-icons-png.flaticon.com/512/0/532.png'
      : 'https://i.imgur.com/TKs7dc2.png';
    const colorMode: 'light' | 'dark' = isLightMode ? 'light' : 'dark';

    const method = StateManager.loadData(this._context, 'method') ?? 'native';
    if (method === undefined) {
      StateManager.saveData(this._context, 'method', 'native');
    }
    console.log('Method: ', method);

    if (output === 'settings') {
      return createSettingsPage(
        webview,
        this._extensionUri,
        method,
        iconLink,
        colorMode,
      );
    } else {
      return createMainPage(webview, this._extensionUri, method, colorMode);
    }
  }
}
