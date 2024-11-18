import * as vscode from 'vscode';

export type TempState = {
  ogFilePath: string; // File path of where the user stores their jupyter notebook file (not the temporary file path)
  tempDirPath: string; // Path of the temporary directory
};

export class StateManager {
  // Base Functions
  static saveData(context: vscode.ExtensionContext, key: string, data: any) {
    context.globalState.update(key, data);
  }

  static loadData(context: vscode.ExtensionContext, key: string): any {
    return context.globalState.get(key);
  }

  // Custom Function

  static saveTempDirState(
    context: vscode.ExtensionContext,
    tempState: TempState,
  ) {
    StateManager.saveData(context, tempState.ogFilePath, tempState);
  }

  static loadTempDirState(
    context: vscode.ExtensionContext,
    id: string,
  ): TempState | undefined {
    return StateManager.loadData(context, id);
    return context.globalState.get(id);
  }

  static saveIsRunning(context: vscode.ExtensionContext, isRunning: boolean) {
    StateManager.saveData(context, 'isRunning', isRunning);
  }

  static loadIsRunning(context: vscode.ExtensionContext): boolean {
    return StateManager.loadData(context, 'isRunning') || false;
  }
}
