import * as vscode from 'vscode';

export type TempState = {
  id: string; // hash of python file
  path: string;
};

export class StateManager {
  static saveTempDirState(
    context: vscode.ExtensionContext,
    tempState: TempState,
  ) {
    context.globalState.update(tempState.id, tempState);
  }

  static loadTempDirState(
    context: vscode.ExtensionContext,
    id: string,
  ): TempState | undefined {
    return context.globalState.get(id);
  }
}
