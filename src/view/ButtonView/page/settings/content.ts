import * as vscode from 'vscode';
import os from 'os';

import { getNonce } from '../../../../helpers/utils';
import { createLayout } from './layout';

/**
 * html wrapper is needed for prettier formatting
 */
const html = String.raw;

export function createSettingsPage(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  method: 'docker' | 'native',
  iconLink: string,
  colorMode: string,
) {
  const platform = String(os.platform());
  const arch = os.arch();
  const links: Record<string, Record<string, string>> = {
    win32: {
      x64: 'https://leakage-detector.vercel.app/binaries/windows-x64.zip',
    },
    linux: {
      x64: 'https://leakage-detector.vercel.app/binaries/linux-x64.zip',
    },
    darwin: {
      arm64: 'https://leakage-detector.vercel.app/binaries/macos-arm64.zip',
      x64: 'https://leakage-detector.vercel.app/binaries/macos-x64.zip',
    },
  };
  const platformDisplay =
    platform === 'win32'
      ? 'Windows'
      : platform === 'darwin'
        ? 'MacOS'
        : 'Linux';
  const binaryLink = links[platform][arch];

  const nonce = getNonce();

  // FIXME: CSS uses a combination of BEM style and tailwind-esque style classes. This is code smell. Need to convert to tailwind in the future

  return createLayout(
    webview,
    extensionUri,
    { nonce },
    html`<div>
      <h2 class="mb-10px">User Settings</h2>

      <div class="flex justify-between mt-30px">
        <label class="center" for="method-select">Run Mode</label>
        <select
              class="select ${colorMode}"
              name="method-select"
              id="method-select"
            >
              ${
                method === 'docker'
                  ? html`
                      <option value="Docker" selected="selected">Docker</option>
                      <option value="Native">Native</option>
                    `
                  : html` <option value="Docker">Docker</option>
                      <option value="Native" selected="selected">
                        Native
                      </option>`
              }
            </select>
      </div>


      <div
        id="nativeButtons"
        style="display:none"
        class="mt-10px"
      ${method === 'docker' ? 'hidden="true"' : ''}"
      >
        <div class="flex justify-between">
          <span class="">${platformDisplay}</span>
          <a class="" href=${binaryLink}>
            <img src="${iconLink}" alt="Download" width="20" height="20" />
          </a>
        </div>

        <button class="button mt-10px" id="install-leakage">Install</button>
      </div>

      <div class="help">
        <span>Need help?</span>
        <a
          class=""
          id="website-link"
          href="https://leakage-detector.vercel.app/"
          >Click here to learn more about data leakage</a
        >
      </div>
    </div>`,
  );
}
