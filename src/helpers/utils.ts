import path from 'path';
import os from 'os';
import fs from 'fs';

import * as vscode from 'vscode';

export const CONTAINER_NAME = 'data-leakage--leakage-analysis';
export const IMAGE_NAME = 'owentruong/leakage-analysis:latest';
export const TEMP_DIR = path.join(os.tmpdir(), 'data-leakage-vscode');
export const ALGO_HOST_DIR_PATH = path.join(TEMP_DIR, 'leakage');
export const ALGO_CONTAINER_DIR_PATH = path.join('/', 'leakage');

if (!fs.existsSync(ALGO_HOST_DIR_PATH)) {
  fs.mkdirSync(ALGO_HOST_DIR_PATH, { recursive: true });
}

export const getAlgoInputFilePath = (parentDirPath: string) =>
  path.join(parentDirPath, 'input.py');

export function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function getWebviewOptions(
  extensionUri: vscode.Uri,
): vscode.WebviewOptions {
  return {
    // Enable javascript in the webview
    enableScripts: true,

    // And restrict the webview to only loading content from our extension's `media` directory.
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
  };
}
