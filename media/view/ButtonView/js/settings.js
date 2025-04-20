// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
  const vscode = acquireVsCodeApi();
  const installLeakageBtn = document.getElementById('install-leakage');
  // const installLeakageBtn2 = document.getElementById('install-leakage2');
  // const installLeakageBtn3 = document.getElementById('install-leakage3');
  const nativeButtons = document.getElementById('nativeButtons');
  const methodSelect = document.getElementById('method-select');

  methodSelect.addEventListener('change', (e) => {
    console.log(methodSelect.value);
    console.log(e);
    switch (methodSelect.value) {
      case 'Docker':
        nativeButtons.classList.add('hidden');
        installLeakageBtn.classList.add('hidden');
        vscode.postMessage({ type: 'dockerChosen' });
        break;
      case 'Native':
        nativeButtons.classList.remove('hidden');
        installLeakageBtn.classList.remove('hidden');
        vscode.postMessage({ type: 'nativeChosen' });
        break;
      case 'empty':
        nativeButtons.classList.add('hidden');
        break;
    }
  });

  installLeakageBtn.addEventListener('click', (e) => {
    vscode.postMessage({ type: 'openFilePicker' });
    installLeakageBtn.disabled = true;
  });

  // Handle messages sent from the extension to the webview
  window.addEventListener('message', (event) => {
    const message = event.data; // The json data that the extension sent
    console.log('Message: ', message);
    switch (message.type) {
      case 'filePickerDone': {
        installLeakageBtn.disabled = false;
        // installLeakageBtn2.disabled = false;
        // installLeakageBtn3.disabled = false;
        break;
      }
    }
  });
})();
