// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
    const vscode = acquireVsCodeApi();
    const installLeakageBtn = document.getElementById('install-leakage');
    const nativeCheck = document.getElementById("nativeCheck");
    var nativeButtons = document.getElementById("nativeButtons");
    const dockerCheck = document.getElementById("dockerCheck");
  
    
    installLeakageBtn.addEventListener('click', (e) => {
      vscode.postMessage({ type: 'openFilePicker' });
      installLeakageBtn.disabled = true;
    });
  
    nativeCheck.addEventListener('click', (e) => {
      if (nativeCheck.checked == true){
        dockerCheck.checked = false;
        nativeButtons.style.display = "block";
      }
      else{
        dockerCheck.checked = true;
        nativeButtons.style.display = "none";
      }
      installLeakageBtn.disabled = false;
      run_button.disabled = false;
    });
  
    dockerCheck.addEventListener('click', (e) => {
      if (dockerCheck.checked == true){
        nativeCheck.checked = false;
        nativeButtons.style.display = "none";
      }
      else{
        nativeCheck.checked = true;
        nativeButtons.style.display = "block";
      }
      installLeakageBtn.disabled = false;
      run_button.disabled = false;
    });
  
  
  
  
    vscode.postMessage({ type: 'webviewLoaded' });
  
    // Handle messages sent from the extension to the webview
    window.addEventListener('message', (event) => {
      const message = event.data; // The json data that the extension sent
      switch (message.type) {
        case 'analysisCompleted': {
          native_button.disabled = false;
          docker_button.disabled = false;
          break;
        }
        case 'webviewLoaded': {
          native_button.disabled = message.isRunning ?? false;
          docker_button.disabled = message.isRunning ?? false;
          break;
        }
        case 'filePickerDone': {
          installLeakageBtn.disabled = false;
          break;
        }
      }
    });
  
  })();
  