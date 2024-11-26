import * as vscode from 'vscode';

export function checkTerminalEnded(
  targetTerminal: vscode.Terminal,
  resolve: (value: unknown) => void,
  reject: (reason?: any) => void,
) {
  // Listen to terminal output
  const disposable = vscode.window.onDidEndTerminalShellExecution((e) => {
    if (e.terminal === targetTerminal) {
      disposable.dispose(); // Clean up the event listener

      if (e.exitCode === 0) {
        resolve(null);
      } else {
        reject(`Terminal exited with code ${e.exitCode}`);
      }
    }
  });
}
