import { getNonce } from '../../../../helpers/utils';
import { createPopup } from '../../components/popup';

import * as vscode from 'vscode';
import { createLayout } from './layout';
import { createPrimaryButton } from '../../components/primaryButton';

/**
 * html wrapper is needed for prettier formatting
 */
const html = String.raw;

export function createMainPage(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  method: 'docker' | 'native',
  colorMode: 'light' | 'dark',
) {
  const nonce = getNonce();

  return createLayout(
    webview,
    extensionUri,
    { nonce, colorMode },
    html`
      <div class="">
        <h2
          class="mb-6 text-(--vscode-foreground) text-xl font-semibold hidden"
        >
          Data Leakage
        </h2>
        <div>
          <div ${method === 'native' ? 'hidden' : ''}>
            ${createPrimaryButton(
              'Run Data Leakage Analysis',
              'run-leakage-docker',
            )}
          </div>
          <div ${method === 'native' ? '' : 'hidden'}>
            ${createPrimaryButton(
              'Run Data Leakage Analysis',
              'run-leakage-native',
            )}
          </div>
        </div>

        <!-- TODO: Add create popup right over here 
        -->

        ${createPopup()}
      </div>
    `,
  );
}
