import fs from 'fs';
import path from 'path';

import * as vscode from 'vscode';

import { getNonce, getWebviewOptions } from '../helpers/utils';
import { analyzeNotebookWithProgress } from '../data/Button/button';
import { StateManager } from '../helpers/StateManager';
import LeakageInstance from '../data/Leakages/LeakageInstance/LeakageInstance';
import { installLeakageFolder } from '../data/Button/LeakageProgramInstaller';
import { LeakageAdapterCell } from '../helpers/Leakages/createLeakageAdapters';

/**
 * Manages Button Webview
 */
export class ButtonViewProvider {
  public static readonly viewType = 'data-leakage.buttonView';

  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
    private readonly _changeView: () => Promise<void>,
    private readonly _output: String,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = getWebviewOptions(this._extensionUri);

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, this._output);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'analyzeNotebookNative':
          await this.analyzeNotebookNative();
          break;
          case 'analyzeNotebookDocker':
            await this.analyzeNotebookDocker();
            break;
        case 'webviewLoaded':
          try {
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
      }
    });
  }

  public async refresh (output: String){
    try{
      if (this._view) {
        this._view.webview.html = this._getHtmlForWebview(this._view?.webview, output);
      } else {
        throw new Error("View wasn't created.");
      }
      
    } catch(err){
      console.log(err);
    }
  }

  public async analyzeNotebookNative() {
    console.log("native method was chosen");
    if (this._view) {
      await analyzeNotebookWithProgress(
        this._view,
        this._context,
        this._changeView,
        "native"
      );
    } else {
      throw new Error("View wasn't created.");
    }
  }

  public async analyzeNotebookDocker() {
    console.log("docker method was chosen");
    if (this._view) {
      await analyzeNotebookWithProgress(
        this._view,
        this._context,
        this._changeView,
        "docker"
      );
    } else {
      throw new Error("View wasn't created.");
    }
  }

  

  private _getHtmlForWebview(webview: vscode.Webview, output: String) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'button', 'main.js'),
    );

    const scriptUri2 = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'button', 'settings.js'),
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

    const stylePriorityUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'button', 'prio.css'),
    );

    StateManager.saveIsRunning(this._context, false);

    const nonce = getNonce();
    if(output == "settings"){
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
        <link href="${stylePriorityUri}" rel="stylesheet">
        

				<title>Data Leakage</title>
			</head>
			<body>
      <div class="row">
        <div class="column">Docker</div>
        <div class="column">
          <label for="dockerCheck" class="switch"> 
            <input type="checkbox" id="dockerCheck" checked>
            <span class="slider round"></span>
          </label>
        </div>
      </div>

      <div class="row">
        <div class="column">Native Binary</div>
        <div class="column">
          <label for="nativeCheck" class="switch"> 
            <input type="checkbox" id="nativeCheck">
            <span class="slider round"></span>
          </label>
        </div>
      </div>


      <label for="method-select" hidden>Choose your Run method:</label>
        <select name="method-select" id="method-select" hidden>
          <option value="empty">--Please choose an option--</option>
          <option value="Docker">Docker</option>
          <option value="Native">Native Binary</option>
        </select>
      
      <div id="nativeButtons" style="display:none" hidden="true">
        <!--
				<button class="button secondary" id="install-leakage">Install</button>
        <div class="dropdown"> 
          <button class="dropbtn">Download</button>
          <div class="dropdown-content"> 
            <a class="" id="website-link" href="https://leakage-detector.vercel.app/binaries/windows-x64.zip">Windows-x64</a>
            <a class="" id="website-link" href="https://leakage-detector.vercel.app/binaries/macos14-arm64.zip">MacOS14-ARM64</a>
            <a class="" id="website-link" href="https://leakage-detector.vercel.app/binaries/linux-amd64.zip">Linux-x64</a>
          </div>
        </div>
        -->

        <label for="os-select">Choose your OS:</label>
        <select name="binary_select" id="os-select">
          <option value="empty"></option>
          <option value="Windows">Windows</option>
          <option value="Mac">Mac</option>
          <option value="Linux">Linux</option>
        </select>
        <br></br>
        <div id="windows-dl" style="display:none" hidden="true">
          <div class="row">
            <div class="column">
              <a class="button" href="https://leakage-detector.vercel.app/binaries/windows-x64.zip">Download</a>
            </div>
            <div class="column">
              <button class="button secondary" id="install-leakage">Install</button>
            </div>
          </div>
        </div>
        <div id="mac-dl" style="display:none" hidden="true">
          <div class="row">
            <div class="column">
              <a class="button" id="website-link" href="https://leakage-detector.vercel.app/binaries/macos14-arm64.zip">Download</a>
            </div>
            <div class="column">
              <button class="button secondary" id="install-leakage2">Install</button>
            </div>
          </div>
        </div>
        <div id="linux-dl" style="display:none" hidden="true">
          <div class="row">
            <div class="column">
              <a class="button" id="website-link" href="https://leakage-detector.vercel.app/binaries/linux-amd64.zip">Download</a>
            </div>
            <div class="column">
              <button class="button secondary" id="install-leakage3">Install</button>
            </div>
          </div>
        </div>
      
   
      </div>
  
      <div class="help">
        <span>Need help?</span>
        <a class="" id="website-link" href="https://leakage-detector.vercel.app/">Click here to learn more about data leakage</a>
      </div>
        

        <script nonce="${nonce}" src="${scriptUri2}"></script>
			</body>
			</html>`;
    }
    else{
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
        <link href="${stylePriorityUri}" rel="stylesheet">

				<title>Data Leakage</title>
			</head>
			<body>
        <div class="dropdown"> 
              <button class="dropbtn">Run Data Leakage Analysis
              </button>
              <div class="dropdown-content"> 
                <button class="button" id="run-leakage-docker">Docker</button>
                <button class="button" id="run-leakage-native">Native Binary</button> 
              </div>
          </div>
        

        <script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
  }
}
