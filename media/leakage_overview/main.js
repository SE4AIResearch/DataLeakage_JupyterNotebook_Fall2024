// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
  const vscode = acquireVsCodeApi();
  const preprocessCount = document.getElementById('preprocess');
  const overlapCount = document.getElementById('overlap');
  const multiTestCount = document.getElementById('multitest');
  const preprocessList = document.getElementById('preprocess-lines-list');
  const overlapList = document.getElementById('overlap-lines-list');
  const multiTestList = document.getElementById('multitest-lines-list');

  // Handle messages sent from the extension to the webview
  window.addEventListener('message', (event) => {
    const message = event.data; // The json data that the extension sent

    switch (message.type) {
      // Leakage Overview - leakage summary
      case 'changeCount': {
        preprocessCount.textContent = message.preprocessingCount;
        overlapCount.textContent = message.overlapCount;
        multiTestCount.textContent = message.multiTestCount;

        break;
      }
      case 'changeRows':
        const table = document.getElementById('leakage-instances-table');
        // Reset table to only headers
        table.innerHTML = `
          <tr>
            <th>ID</th>
            <th>Relation ID</th>
            <th>Type</th>
            <th>General Cause</th>
            <th>Cell</th>
            <th>Line</th>
            <th>Model Variable Name</th>
            <th>Data Variable Name</th>
            <th>Method</th>
          </tr>
        `;

        message.rows.forEach((row) => {
          const tr = document.createElement('tr');
          tr.classList.add('clickable');

          const idTd = document.createElement('td');
          idTd.textContent = row.id;
          tr.appendChild(idTd);

          const relationIdTd = document.createElement('td');
          relationIdTd.textContent = row.relationId;
          tr.appendChild(relationIdTd);

          const typeTd = document.createElement('td');
          typeTd.textContent = row.type;
          tr.appendChild(typeTd);

          const causeTd = document.createElement('td');
          causeTd.textContent = row.cause;
          tr.appendChild(causeTd);

          const cellTd = document.createElement('td');
          cellTd.textContent = row.cell;
          tr.appendChild(cellTd);

          const lineTd = document.createElement('td');
          lineTd.textContent = row.line;
          tr.appendChild(lineTd);

          const modelTd = document.createElement('td');
          modelTd.textContent = row.model;
          tr.appendChild(modelTd);

          const variableTd = document.createElement('td');
          variableTd.textContent = row.variable;
          tr.appendChild(variableTd);

          const methodTd = document.createElement('td');
          methodTd.textContent = row.method;
          tr.appendChild(methodTd);

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
