// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
  const vscode = acquireVsCodeApi();
  const native_button = document.getElementById('run-leakage-native');
  const docker_button = document.getElementById('run-leakage-docker');
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
  const methodCheck = document.getElementById("method-select");

  
/*   var nativeButtons = document.getElementById("nativeButtons");
  const dockerCheck = document.getElementById("dockerCheck");

  run_button.addEventListener('click', (e) => {
    if (nativeCheck.checked == true){
      vscode.postMessage({ type: 'analyzeNotebookNative' });
      native_button.disabled = true;
      docker_button.disabled = true;
    }
    else {
      vscode.postMessage({ type: 'analyzeNotebookDocker' });
      native_button.disabled = true;
      docker_button.disabled = true;
    }
  }); */

  native_button.addEventListener('click', (e) => {
    vscode.postMessage({ type: 'analyzeNotebookNative' });
    native_button.disabled = true;
    docker_button.disabled = true;
  });

  docker_button.addEventListener('click', (e) => {
    vscode.postMessage({ type: 'analyzeNotebookDocker' });
    native_button.disabled = true;
    docker_button.disabled = true;
  });

  installLeakageBtn.addEventListener('click', (e) => {
    vscode.postMessage({ type: 'openFilePicker' });
    installLeakageBtn.disabled = true;
  });

  installLeakageBtn2.addEventListener('click', (e) => {
    vscode.postMessage({ type: 'openFilePicker' });
    installLeakageBtn2.disabled = true;
  });

  installLeakageBtn3.addEventListener('click', (e) => {
    vscode.postMessage({ type: 'openFilePicker' });
    installLeakageBtn3.disabled = true;
  });

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
          break;
        case "Native":
          nativeButtons.style.display = "block";
          break;
        case "empty":
          nativeButtons.style.display = "none";
          break;
      }
    });
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

  // /**
  //  * @param {Array<{ value: string }>} colors
  //  */
  // function updateColorList(colors) {
  //   const ul = document.querySelector('.color-list');
  //   ul.textContent = '';
  //   for (const color of colors) {
  //     const li = document.createElement('li');
  //     li.className = 'color-entry';

  //     const colorPreview = document.createElement('div');
  //     colorPreview.className = 'color-preview';
  //     colorPreview.style.backgroundColor = `#${color.value}`;
  //     colorPreview.addEventListener('click', () => {
  //       onColorClicked(color.value);
  //     });
  //     li.appendChild(colorPreview);

  //     const input = document.createElement('input');
  //     input.className = 'color-input';
  //     input.type = 'text';
  //     input.value = color.value;
  //     input.addEventListener('change', (e) => {
  //       const value = e.target.value;
  //       if (!value) {
  //         // Treat empty value as delete
  //         colors.splice(colors.indexOf(color), 1);
  //       } else {
  //         color.value = value;
  //       }
  //       updateColorList(colors);
  //     });
  //     li.appendChild(input);

  //     ul.appendChild(li);
  //   }

  //   // Update the saved state
  //   vscode.setState({ colors: colors });
  // }

  // /**
  //  * @param {string} color
  //  */
  // function onColorClicked(color) {
  //   vscode.postMessage({ type: 'colorSelected', value: color });
  // }

  // /**
  //  * @returns string
  //  */
  // function getNewCalicoColor() {
  //   const colors = ['020202', 'f1eeee', 'a85b20', 'daab70', 'efcb99'];
  //   return colors[Math.floor(Math.random() * colors.length)];
  // }

  // function addColor() {
  //   colors.push({ value: getNewCalicoColor() });
  //   updateColorList(colors);
  // }
})();
