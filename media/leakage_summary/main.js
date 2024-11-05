// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

function createRow(type, line, variable, cause) {
  return `
		<td>${type}</td>
		<td>${line}</td>
		<td>${variable}</td>
		<td>${cause}</td>
	`;
}

(function () {
  const vscode = acquireVsCodeApi();
  const preprocess = document.getElementById('preprocess');
  const multitest = document.getElementById('multitest');
  const overlap = document.getElementById('overlap');

  // Handle messages sent from the extension to the webview
  window.addEventListener('message', (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.type) {
      case "changeCount": {
				preprocess.textContent = message.preprocessing;
				multitest.textContent = message.multiTest;
				overlap.textContent = message.overlap;
				break;				
      }
    }
  });
})();
