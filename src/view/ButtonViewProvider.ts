import fs from 'fs';
import path from 'path';
import os from 'os';

import * as vscode from 'vscode';

import { getNonce, getWebviewOptions } from '../helpers/utils';
import { analyzeNotebookWithProgress } from '../data/Button/button';
import { StateManager } from '../helpers/StateManager';
import LeakageInstance from '../data/Leakages/LeakageInstance/LeakageInstance';
import { installLeakageFolder } from '../data/Button/LeakageProgramInstaller';
import { LeakageAdapterCell } from '../helpers/Leakages/createLeakageAdapters';
import { string } from 'zod';

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
        case 'dockerChosen':
          StateManager.saveData(this._context, "method", "docker");
          break;
        case 'nativeChosen':
          StateManager.saveData(this._context, "method", "native");
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
      const test2 = StateManager.loadData(this._context, "method");
      console.log(test2);

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
    
    const user_os = os.platform();
    const user_version = os.release();
    var os_label = user_os.charAt(0).toUpperCase() + user_os.slice(1);
    console.log(user_version);
    var os_link = "";

    if (user_os === 'win32'){
      os_link = "https://leakage-detector.vercel.app/binaries/windows-x64.zip"; 
    }
    else if (user_os === 'linux'){
      os_link = "https://leakage-detector.vercel.app/binaries/linux-amd64.zip";
    }
    else if (user_os === 'darwin'){
      os_link = "https://leakage-detector.vercel.app/binaries/macos14-arm64.zip";
      os_label = "MacOS";
    }
    StateManager.saveData(this._context, "test", "hello");
    const method = StateManager.loadData(this._context, "method");
    if (method === undefined){
      StateManager.saveData(this._context, "method", "docker");
    }

    console.log(vscode.window.activeColorTheme.kind);


    console.log(vscode.window.activeColorTheme.kind);

    var icon_link = "https://i.imgur.com/TKs7dc2.png";
    var color_mode = "dark";
    if (vscode.window.activeColorTheme.kind != 2 && vscode.window.activeColorTheme.kind != 3){
      icon_link = "https://cdn-icons-png.flaticon.com/512/0/532.png";
      color_mode = "light";
    }

    const nonce = getNonce();
    if(output == "settings"){
      var method_select;
      if (method == "docker" || method == undefined){
        method_select = `
        <div class="row">
        <div class="column">
          <div class="middle">
            <label class="center" for="method-select" >Run Mode</label>
          </div>
        </div>
        <div class="column">
          <div class="right">
            <select class="select ${color_mode}" name="method-select" id="method-select" >
              <option value="Docker"selected="selected">Docker</option>
              <option value="Native">Native</option>
            </select>
          </div>
        </div>
      </div>
      <br></br>
    
    <div id="nativeButtons" style="display:none" hidden="true">
      <!--
      https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfWbB640lxeD4tVh_FpmeWaHO094naSHz0bw&s
      <button class="button secondary" id="install-leakage">Install</button>
      <div class="dropdown"> 
        <button class="dropbtn">Download</button>
        <div class="dropdown-content"> 
          <a class="" id="website-link" href="https://leakage-detector.vercel.app/binaries/windows-x64.zip">Windows-x64</a>
          <a class="" id="website-link" href="https://leakage-detector.vercel.app/binaries/macos14-arm64.zip">MacOS14-ARM64</a>
          <a class="" id="website-link" href="https://leakage-detector.vercel.app/binaries/linux-amd64.zip">Linux-x64</a>
        </div>
      </div>
     
      <div class="row" hidden>
        <div class="column">
          <a class="button test" id="website-link" href=${os_link}>Download</a>
        </div>
        <div class="column-right">
          <button class="button secondary test" id="install-leakage">Install</button>
        </div>
      </div>
      <br></br>
       

      <div class="row">
        <div class="column">
          <div class="middle">
            <label for="os-select">OS Selection</label>
          </div>
        </div>
        <div class="column">
          <div class="right">
            <select class="select" name="binary_select" id="os-select">
              <option value="empty"></option>
              <option value="Windows">Windows</option>
              <option value="Mac">Mac</option>
              <option value="Linux">Linux</option>
            </select>
          </div>
        </div>
      </div>
      <br></br>
      
      <div id="windows-dl" style="display:none" hidden="true">
        <div class="row">
          <div class="column">
            <span>Windows-x64</span>
          </div>
          <div class="column">
            <div class="right">
              <a class="img" href="https://leakage-detector.vercel.app/binaries/windows-x64.zip">
                <img src="${icon_link}" alt="Download" justify-content="right" width="20" height="20">
              </a>
            </div>
          </div>
        </div>
      </div>
      <div id="mac-dl" style="display:none" hidden="true">
        <div class="row">
          <div class="column">
            <span>MacOS</span>
          </div>
          <div class="column">
            <div class="right">
              <a class="img" href="https://leakage-detector.vercel.app/binaries/macos14-arm64.zip">
                <img src="${icon_link}" alt="Download" width="20" height="20">
              </a>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="row">
          <div class="column">
             <span>Linux-amd64</span>
          </div>
          <div class="column">
            <div class="right">
              <a class="img" href="https://leakage-detector.vercel.app/binaries/linux-amd64.zip">
                <img src="${icon_link}" alt="Download" width="20" height="20">
              </a>
            </div>
          </div>
        </div>
      </div>
      -->
        <div class="row">
          <div class="column">
             <span>${os_label}</span>
          </div>
          <div class="column">
            <div class="right">
              <a class="img" href=${os_link}>
                <img src="${icon_link}" alt="Download" width="20" height="20">
              </a>
            </div>
          </div>
        </div>
        <br></br>
        <button class="button" id="install-leakage">Install</button>
      
    </div>`;
      }
      else if (method == "native"){
        method_select = `
        <div class="row">
        <div class="column">
          <div class="middle">
            <label class="center" for="method-select" >Run Mode</label>
          </div>
        </div>
        <div class="column">
          <div class="right">
            <select class="select ${color_mode}" name="method-select" id="method-select" >
              <option value="Docker">Docker</option>
              <option value="Native" selected="selected">Native</option>
            </select>
          </div>
        </div>
      </div>
      <br></br>
    
    <div id="nativeButtons" style="display:none">
      <!--
      https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfWbB640lxeD4tVh_FpmeWaHO094naSHz0bw&s
      <button class="button secondary" id="install-leakage">Install</button>
      <div class="dropdown"> 
        <button class="dropbtn">Download</button>
        <div class="dropdown-content"> 
          <a class="" id="website-link" href="https://leakage-detector.vercel.app/binaries/windows-x64.zip">Windows-x64</a>
          <a class="" id="website-link" href="https://leakage-detector.vercel.app/binaries/macos14-arm64.zip">MacOS14-ARM64</a>
          <a class="" id="website-link" href="https://leakage-detector.vercel.app/binaries/linux-amd64.zip">Linux-x64</a>
        </div>
      </div>
     
      <div class="row" hidden>
        <div class="column">
          <a class="button test" id="website-link" href=${os_link}>Download</a>
        </div>
        <div class="column-right">
          <button class="button secondary test" id="install-leakage">Install</button>
        </div>
      </div>
      <br></br>
       

      <div class="row">
        <div class="column">
          <div class="middle">
            <label for="os-select">OS Selection</label>
          </div>
        </div>
        <div class="column">
          <div class="right">
            <select class="select" name="binary_select" id="os-select">
              <option value="empty"></option>
              <option value="Windows">Windows</option>
              <option value="Mac">Mac</option>
              <option value="Linux">Linux</option>
            </select>
          </div>
        </div>
      </div>
      <br></br>
      
      <div id="windows-dl" style="display:none" hidden="true">
        <div class="row">
          <div class="column">
            <span>Windows-x64</span>
          </div>
          <div class="column">
            <div class="right">
              <a class="img" href="https://leakage-detector.vercel.app/binaries/windows-x64.zip">
                <img src="${icon_link}" alt="Download" justify-content="right" width="20" height="20">
              </a>
            </div>
          </div>
        </div>
      </div>
      <div id="mac-dl" style="display:none" hidden="true">
        <div class="row">
          <div class="column">
            <span>MacOS</span>
          </div>
          <div class="column">
            <div class="right">
              <a class="img" href="https://leakage-detector.vercel.app/binaries/macos14-arm64.zip">
                <img src="${icon_link}" alt="Download" width="20" height="20">
              </a>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="row">
          <div class="column">
             <span>Linux-amd64</span>
          </div>
          <div class="column">
            <div class="right">
              <a class="img" href="https://leakage-detector.vercel.app/binaries/linux-amd64.zip">
                <img src="${icon_link}" alt="Download" width="20" height="20">
              </a>
            </div>
          </div>
        </div>
      </div>
      -->
        <div class="row">
          <div class="column">
             <span>${os_label}</span>
          </div>
          <div class="column">
            <div class="right">
              <a class="img" href=${os_link}>
                <img src="${icon_link}" alt="Download" width="20" height="20">
              </a>
            </div>
          </div>
        </div>
        <br></br>
        <button class="button" id="install-leakage">Install</button>
      
    </div>`;
      }
      return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} media/images/dl_icon_light.png https:; script-src 'nonce-${nonce}';">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} media/images/dl_icon_light.png https:; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
        <link href="${stylePriorityUri}" rel="stylesheet">
        

				<title>Data Leakage</title>
			</head>
			<body>
      <h2>User Settings</h2>
      <br>
      <div class="row" hidden>
        <div class="column">Docker</div>
        <div class="column">
          <label for="dockerCheck" class="switch"> 
            <input type="checkbox" id="dockerCheck" checked>
            <span class="slider round"></span>
          </label>
        </div>
      </div>

      <div class="row" hidden>
        <div class="column">Native Binary</div>
        <div class="column">
          <label for="nativeCheck" class="switch"> 
            <input type="checkbox" id="nativeCheck">
            <span class="slider round"></span>
          </label>
        </div>
      </div>

      <!--
      <label for="method-select" >Run Mode</label>
        <select class="select" name="method-select" id="method-select" >
          <option value="empty"></option>
          <option value="Docker">Docker</option>
          <option value="Native">Native Binary</option>
        </select>
      <br>
      -->
      ${method_select}
        
      <br></br>
  
      <div class="help">
        <span>Need help?</span>
        <a class="" id="website-link" href="https://leakage-detector.vercel.app/">Click here to learn more about data leakage</a>
      </div>
        

        <script nonce="${nonce}" src="${scriptUri2}"></script>
			</body>
			</html>`;
    }
    else{
      var run = `<button class="button" id="run-leakage-docker">Run Data Leakage Analysis</button>`;
      if (method == "native"){
        run = `<button class="button" id="run-leakage-native">Run Data Leakage Analysis</button>`;
      }
    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
        <link href="${stylePriorityUri}" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">

				<title>Data Leakage</title>
			</head>
			<body>
        <h2>Data Leakage</h2>
        <br>
        <div> 
            ${run}
          </div>
        

        <script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
  }
}
