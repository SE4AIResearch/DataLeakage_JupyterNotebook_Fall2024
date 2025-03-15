import { getNonce } from '../../../../helpers/utils';
import { createPopup } from '../../components/popup';

import * as vscode from 'vscode';
import { createLayout } from './layout';

/**
 * html wrapper is needed for prettier formatting
 */
const html = String.raw;

export function createMainPage(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  method: string,
) {
  const nonce = getNonce();

  return createLayout(
    webview,
    extensionUri,
    { nonce },
    html`
      <div>
        <h2>Data Leakage</h2>
        <br />
        <div>
          <div ${method === 'native' ? 'hidden' : ''}>
            <button class="button" id="run-leakage-docker">
              Run Data Leakage Analysis
            </button>
          </div>
          <div ${method === 'native' ? '' : 'hidden'}>
            <button class="button" id="run-leakage-native" hidden="true">
              Run Data Leakage Analysis
            </button>
          </div>
        </div>

        <!-- TODO: Add create popup right over here 
        -->
      </div>
    `,
  );
}
