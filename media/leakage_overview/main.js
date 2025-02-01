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
        overlap.textContent = message.overlap;
        multitest.textContent = message.multiTest;
        break;
      }
      case 'changeRows':
        const table = document.getElementById('leakage-instances-table');
        // Reset table to only headers
        table.innerHTML = `
          <tr>
            <th>Type</th>
            <th>Cell</th>
            <th>Line</th>
            <th>Variable</th>
            <th>Cause</th>
          </tr>
        `;
        message.rows.forEach((row) => {
          const tr = document.createElement('tr');
          tr.classList.add('clickable');

          const typeTd = document.createElement('td');
          typeTd.textContent = row.type;
          tr.appendChild(typeTd);

          const cellTd = document.createElement('td');
          cellTd.textContent = row.cell;
          tr.appendChild(cellTd);

          const lineTd = document.createElement('td');
          lineTd.textContent = row.line;
          tr.appendChild(lineTd);

          const variableTd = document.createElement('td');
          variableTd.textContent = row.variable;
          tr.appendChild(variableTd);

          const causeTd = document.createElement('td');
          causeTd.textContent = row.cause
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace(/\b\w/g, (char) => char.toUpperCase());
          tr.appendChild(causeTd);
          table.appendChild(tr);

          tr.onclick = () => {
            vscode.postMessage({ type: 'moveCursor', row });
          };
        });
        break;
      default:
        console.error('Unrecognized message type:', message.type);
    }
  });

  // button.addEventListener('click', (e) => {
  //   vscode.postMessage({ type: 'analyzeNotebook' });
  //   button.disabled = true;
  // });

  // Handle messages sent from the extension to the webview
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
