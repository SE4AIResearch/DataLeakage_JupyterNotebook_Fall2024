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
      // Leakage Overview - leakage summary
      case 'changeCount': {
        preprocess.textContent = message.preprocessing;
        multitest.textContent = message.multiTest;
        overlap.textContent = message.overlap;
        break;
      }
      case 'addRows':
        const table = document.getElementById('leakage-instances-table');
        message.rows.forEach((row) => {
          const tr = document.createElement('tr');

          const typeTd = document.createElement('td');
          typeTd.textContent = row.type;
          tr.appendChild(typeTd);

          const lineTd = document.createElement('td');
          lineTd.textContent = row.line;
          tr.appendChild(lineTd);

          const variableTd = document.createElement('td');
          variableTd.textContent = row.variable;
          tr.appendChild(variableTd);

          const causeTd = document.createElement('td');
          causeTd.textContent = row.cause;
          tr.appendChild(causeTd);

          table.appendChild(tr);
        });
        break;
      default:
        console.error('Unrecognized message type:', message.type);
    }
  });

  // const button = document.querySelector('.button');

  // button.addEventListener('click', (e) => {
  //   vscode.postMessage({ type: 'analyzeNotebook' });
  //   button.disabled = true;
  // });

  // // Handle messages sent from the extension to the webview
  // window.addEventListener('message', (event) => {
  //   const message = event.data; // The json data that the extension sent
  //   switch (message.type) {
  //     case 'analysisCompleted': {
  //       button.disabled = false;
  //       break;
  //     }
  //   }
  // });

  vscode.postMessage({ type: 'webviewLoaded' });
})();
