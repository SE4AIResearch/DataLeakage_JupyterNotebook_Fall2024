// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
    const vscode = acquireVsCodeApi();
    const installLeakageBtn = document.getElementById('install-leakage');
    const installLeakageBtn2 = document.getElementById('install-leakage2');
    const installLeakageBtn3 = document.getElementById('install-leakage3');
    const nativeCheck = document.getElementById("nativeCheck");
    var nativeButtons = document.getElementById("nativeButtons");
    const dockerCheck = document.getElementById("dockerCheck");
    const selectCheck = document.getElementById("os-select");
    var win = document.getElementById("windows-dl");
    var mac = document.getElementById("mac-dl");
    var linux = document.getElementById("linux-dl");

    const win_link = document.getElementById("windows-link");

    const methodCheck = document.getElementById("method-select");

/*     win_link.addEventListener('click', (e)=> {
      location.href = "https://leakage-detector.vercel.app/binaries/windows-x64.zip";
    }); */
  
    
    
  
    nativeCheck.addEventListener('click', (e) => {
      if (nativeCheck.checked === true){
        dockerCheck.checked = false;
        nativeButtons.style.display = "block";
      }
      else{
        dockerCheck.checked = true;
        nativeButtons.style.display = "none";
      }
      installLeakageBtn.disabled = false;
    });
  
    dockerCheck.addEventListener('click', (e) => {
      if (dockerCheck.checked === true){
        nativeCheck.checked = false;
        nativeButtons.style.display = "none";
      }
      else{
        nativeCheck.checked = true;
        nativeButtons.style.display = "block";
      }
      installLeakageBtn.disabled = false;
    });
    
    selectCheck.addEventListener('click', (e) => {
      selectCheck.addEventListener('change', (e) => {
        switch (selectCheck.value) {
          case "Windows":
            win.style.display = "block";
            mac.style.display = "none";
            linux.style.display = "none";
            installLeakageBtn.disabled = false;
            installLeakageBtn2.disabled = false;
            installLeakageBtn3.disabled = false;
            break;
          case "Mac":
            win.style.display = "none";
            mac.style.display = "block";
            linux.style.display = "none";
            installLeakageBtn.disabled = false;
            installLeakageBtn2.disabled = false;
            installLeakageBtn3.disabled = false;
            break;
          case "Linux":
            win.style.display = "none";
            mac.style.display = "none";
            linux.style.display = "block";
            installLeakageBtn.disabled = false;
            installLeakageBtn2.disabled = false;
            installLeakageBtn3.disabled = false;
            break;
          case "empty":
            win.style.display = "none";
            mac.style.display = "none";
            linux.style.display = "none";
            installLeakageBtn.disabled = false;
            installLeakageBtn2.disabled = false;
            installLeakageBtn3.disabled = false;
            break;
        }
      });
    });

    methodCheck.addEventListener('click', (e) => {
      methodCheck.addEventListener('change', (e) => {
        switch (methodCheck.value) {
          case "Docker":
            nativeButtons.style.display = "none";
            vscode.postMessage({ type: 'dockerChosen' });
            break;
          case "Native":
            nativeButtons.style.display = "block";
            vscode.postMessage({ type: 'nativeChosen' });
            break;
          case "empty":
            nativeButtons.style.display = "none";
            break;
        }
      });
    });
  
  
    installLeakageBtn.addEventListener('click', (e) => {
      vscode.postMessage({ type: 'openFilePicker' });
      installLeakageBtn.disabled = true;
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
          installLeakageBtn2.disabled = false;
          installLeakageBtn3.disabled = false;
          break;
        }
      }
    });
  
  })();
  