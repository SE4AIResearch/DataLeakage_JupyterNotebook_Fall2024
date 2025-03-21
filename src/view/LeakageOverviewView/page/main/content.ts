import { getNonce } from '../../../../helpers/utils';

import * as vscode from 'vscode';
import { createLayout } from './layout';

/**
 * html wrapper is needed for prettier formatting
 */
const html = String.raw;

export function createMainPage(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  colorMode: 'light' | 'dark',
) {
  const nonce = getNonce();

  return createLayout(
    webview,
    extensionUri,
    { nonce, colorMode },
    html`
      <div class="">
        <h1>Leakage Summary</h1>
        <table>
          <tr>
            <th>Type</th>
            <th>Unique Leakage Count</th>
          </tr>
          <tr>
            <td>Pre-Processing</td>
            <td id="preprocess">0</td>
          </tr>
          <tr>
            <td>Overlap</td>
            <td id="overlap">0</td>
          </tr>
          <tr>
            <td>Multi-Test</td>
            <td id="multitest">0</td>
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
      </div>
    `,
  );
}
