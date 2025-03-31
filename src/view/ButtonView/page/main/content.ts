import { getNonce } from '../../../../helpers/utils';

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
      <div class="flex flex-col justify-between h-[100vh]">
        <div
          class="popup flex flex-col pb-4 pt-2 px-5 mt-4 bg-neutral-500/35 rounded-sm"
        >
          <div class="mt-4 mb-4 flex justify-center items-center">
            <h2
              class="text-neutral-600 dark:text-neutral-300 text-2xl font-semibold text-center min-[320px]:hidden font-sans"
            >
              DATA LEAKAGE
            </h2>
            <img
              src="${colorMode === 'light'
                ? 'https://gcdnb.pbrd.co/images/M1r6OJd2ZLZj.png?o=1'
                : 'https://gcdnb.pbrd.co/images/MlvjcJrjA69l.png?o=1'}"
              alt="Leakage Detector Logo"
              class="h-0 max-h-[33px]! min-[320px]:h-full"
            />
          </div>

          <div class="mb-6">
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

          <div
            class="
          w-full
          h-1
          rounded-lg
          bg-neutral-500/50
          mb-5
          "
          ></div>

          <div class="">
            <p class="text-neutral-700 dark:text-neutral-300 text-center">
              First time installing?
            </p>
          </div>

          <div class="">
            <p class="text-neutral-700 dark:text-neutral-300 text-center">
              Click the gear icon above, or
            </p>
            <div class="flex justify-center items-center">
              <a class="popup__anchor-settings-btn cursor-pointer font-semibold"
                >click here</a
              >
            </div>
          </div>
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
              If you would like extra options besides the quickfix we provide,
              we recommend LLM extensions like
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
      </div>
    `,
  );
}
