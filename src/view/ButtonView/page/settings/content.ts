import * as vscode from 'vscode';
import os from 'os';

import { getNonce } from '../../../../helpers/utils';
import { createLayout } from './layout';
import { createPrimaryButton } from '../../components/primaryButton';

/**
 * html wrapper is needed for prettier formatting
 */
const html = String.raw;

export function createSettingsPage(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  method: 'docker' | 'native',
  iconLink: string,
  colorMode: 'light' | 'dark',
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
    { nonce, colorMode },
    html` <div class="flex flex-col justify-between h-[100vh]">
      <div>
        <h2
          class="mb-6 text-neutral-700 dark:text-neutral-300 text-xl font-semibold"
        >
          User Settings
        </h2>

        <div class="mb-6 flex justify-between items-center">
          <label class="" for="method-select">Run Mode</label>
          <div class="grid justify-end items-center">
            <select
              class="col-start-1 row-start-1 text-(--vscode-input-foreground) bg-(--vscode-input-background) rounded-md pl-2 pr-6 py-1 appearance-none outline-transparent!"
              name="method-select"
              id="method-select"
            >
              ${method === 'docker'
                ? html`
                    <option value="Docker" selected="selected">Docker</option>
                    <option value="Native">Native</option>
                  `
                : html`
                    <option value="Docker">Docker</option>
                    <option value="Native" selected="selected">Native</option>
                  `}
            </select>
            <img
              src="${colorMode === 'dark'
                ? 'https://raw.githubusercontent.com/microsoft/vscode-icons/2ca0f3225c1ecd16537107f60f109317fcfc3eb0/icons/dark/triangle-down.svg'
                : 'https://raw.githubusercontent.com/microsoft/vscode-codicons/f3fee3d9b8878fe0056ceda328119227c0b66a53/src/icons/triangle-down.svg'}"
              class="pointer-events-none col-start-1 row-start-1 justify-self-end mr-1 text-${colorMode ===
              'dark'
                ? '(--vscode-input-foreground)'
                : 'black'}"
            />
          </div>
        </div>

        <div
          id="nativeButtons"
          style="display:none"
          class="mb-6 flex justify-between items-center"
          ${method === 'docker' ? 'hidden="true"' : ''}
        >
          <span class="">${platformDisplay}</span>
          <a class="" href=${binaryLink}>
            <img
              src="${iconLink}"
              class="text-(--vscode-foreground)"
              alt="Download"
              width="20"
              height="20"
            />
          </a>
        </div>

        ${createPrimaryButton('Install', 'install-leakage')}
      </div>

      <div class="help mb-2">
        <div class="mb-2">
          <p>Need help?</p>
          <a
            class=""
            id="website-link"
            href="https://leakage-detector.vercel.app/"
            >Click here to learn more about data leakage</a
          >
        </div>

        <div
          class="
          w-full
          h-1
          rounded-lg
          bg-neutral-500/50
          mb-2
          "
        ></div>

        <div class="mb-2">
          <p>
            If you would like extra options besides the quickfix we provide, we
            recommend LLM extensions like
            <a
              href="https://marketplace.visualstudio.com/items?itemName=GitHub.copilot"
              >GitHub Copilot</a
            >
            or
            <a
              href="https://marketplace.visualstudio.com/items?itemName=Continue.continue"
              >Continue</a
            >.
          </p>
        </div>
      </div>
    </div>`,
  );
}
