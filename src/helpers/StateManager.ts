import * as vscode from 'vscode';

export type TempState = {
  ogFilePath: string; // File path of where the user stores their jupyter notebook file (not the temporary file path)
  tempDirPath: string; // Path of the temporary directory
};

export class StateManager {
  static saveTempDirState(
    context: vscode.ExtensionContext,
    tempState: TempState,
  ) {
    context.globalState.update(tempState.ogFilePath, tempState);
  }

  static loadTempDirState(
    context: vscode.ExtensionContext,
    id: string,
  ): TempState | undefined {
    return context.globalState.get(id);
  }
}
