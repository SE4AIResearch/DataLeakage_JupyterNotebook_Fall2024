// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
  const vscode = acquireVsCodeApi();
  const native_button = document.getElementById('run-leakage-native');
  const docker_button = document.getElementById('run-leakage-docker');
  const popupSettingsAnchor = document.querySelector(
    '.popup__anchor-settings-btn',
  );
  //const installLeakageBtn = document.getElementById('install-leakage');

  // Get webview state to persist
  // https://code.visualstudio.com/api/extension-guides/webview

  // Get quick fix buttons
  const runBtnDiv = document.getElementById('run-leakage');
  const quickFixDialog = document.getElementById('quick-fix-dialog');
  const keepChangesBtn = document.getElementById('keep-changes');
  const revertChangesBtn = document.getElementById('revert-changes');

  // Initialize state
  const previousState = vscode.getState() || {
    isQuickFixActive: false,
  };

  // Initial UI setup based on state
  updateUIDisplay(previousState.isQuickFixActive);

  // Helper function to toggle between run button and quick fix dialog
  function updateUIDisplay(showQuickFix) {
    if (runBtnDiv && quickFixDialog) {
      runBtnDiv.style.display = showQuickFix ? 'none' : 'block';
      quickFixDialog.style.display = showQuickFix ? 'block' : 'none';
    }

    // Update button states
    if (keepChangesBtn && revertChangesBtn) {
      keepChangesBtn.disabled = !showQuickFix;
      revertChangesBtn.disabled = !showQuickFix;
    }
    // Save state
    vscode.setState({
      isQuickFixActive: showQuickFix,
    });
  }

  // We'll make the quick fix buttons invisible at start
  if (keepChangesBtn) {
    keepChangesBtn.addEventListener('click', () => {
      vscode.postMessage({
        type: 'quickFixDecision',
        decision: 'keep',
      });

      // Update UI
      updateUIDisplay(false);
    });
  }
  if (revertChangesBtn) {
    revertChangesBtn.addEventListener('click', () => {
      vscode.postMessage({
        type: 'quickFixDecision',
        decision: 'revert',
      });

      // Update UI
      updateUIDisplay(false);
    });
  }

  // Regular button handlers
  native_button.addEventListener('click', (e) => {
    vscode.postMessage({ type: 'analyzeNotebookNative' });
    native_button.disabled = true;
    docker_button.disabled = true;
  });

  docker_button.addEventListener('click', (e) => {
    console.log('test');
    vscode.postMessage({ type: 'analyzeNotebookDocker' });
    native_button.disabled = true;
    docker_button.disabled = true;
  });

  popupSettingsAnchor.addEventListener('click', (e) => {
    vscode.postMessage({ type: 'goToSettingsPage' });
  });

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
        // Restore UI state based on persisted state
        const state = vscode.getState() || { isQuickFixActive: false };
        updateUIDisplay(state.isQuickFixActive);
        break;
      }
      case 'filePickerDone': {
        installLeakageBtn.disabled = false;
        break;
      }
      case 'showQuickFixDialog': {
        // Activate the buttons
        updateUIDisplay(true);
        break;
      }
      case 'hideQuickFixDialog': {
        // Deactivate the buttons
        updateUIDisplay(false);
        break;
      }
    }
  });

  vscode.postMessage({ type: 'webviewLoaded' });

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
