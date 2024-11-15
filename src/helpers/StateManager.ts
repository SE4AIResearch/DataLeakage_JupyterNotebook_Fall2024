/**
 * DEPRECATED
 * DEPRECATED
 * DEPRECATED
 * DEPRECATED
 */

import * as vscode from 'vscode';

export type TempState = {
  ogFilePath: string; // File path of where the user stores their jupyter notebook file (not the temporary file path)
  tempDirPath: string; // Path of the temporary directory
};

// TODO: Convert to non-static methods and use <T> for reusability
export class StateManager {
  static saveTempDirState(
    context: vscode.ExtensionContext,
    tempState: TempState,
  ) {
    context.globalState.update(tempState.ogFilePath, tempState);
  }

  static saveIsRunning(context: vscode.ExtensionContext, isRunning: boolean) {
    context.globalState.update('isRunning', isRunning);
  }

  static loadIsRunning(context: vscode.ExtensionContext): boolean {
    return context.globalState.get('isRunning') || false;
  }

  static loadTempDirState(
    context: vscode.ExtensionContext,
    id: string,
  ): TempState | undefined {
    return context.globalState.get(id);
  }
}
