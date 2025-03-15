import * as vscode from 'vscode';

/**
 * html wrapper is needed for prettier formatting
 */
const html = String.raw;

export function createLayout(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  data: {
    nonce: string;
    colorMode: 'light' | 'dark';
  },
  content: string,
): string {
  const uriPaths = {
    scripts: [
      webview.asWebviewUri(
        vscode.Uri.joinPath(
          extensionUri,
          'media',
          'view',
          'ButtonView',
          'js',
          'settings.js',
        ),
      ),
    ],
    styles: [
      // list the styles in the order to load them, index 0 is loaded first
      webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'media', 'view', 'index.css'),
      ),
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
    ],
  };

  return html`<!doctype html>
    <html lang="en" class="${data.colorMode}">
      <head>
        <meta charset="UTF-8" />

        <!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
        <meta
          http-equiv="Content-Security-Policy"
          content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} media/images/dl_icon_light.png https:; script-src 'nonce-${data.nonce}';"
        />
        <meta
          http-equiv="Content-Security-Policy"
          content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} media/images/dl_icon_light.png https:; script-src 'nonce-${data.nonce}';"
        />

        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        ${uriPaths.styles.reduce(
          (html, path) =>
            html + '\n' + `<link href="${path}" rel="stylesheet" />`,
          '',
        )}

        <title>Data Leakage</title>
      </head>
      <body>
        ${content}
        ${uriPaths.scripts.reduce(
          (html, path) =>
            html +
            '\n' +
            `<script defer nonce="${data.nonce}" src="${path}" />`,
          '',
        )}
      </body>
    </html>`;
}
