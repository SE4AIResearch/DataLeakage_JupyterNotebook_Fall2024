import * as vscode from 'vscode';
import { LeakageType, Metadata, Taint } from '../Leakages/types';
import { LEAKAGE_ERROR } from './notebookDiagnostics';
import { NotAnalyzedError } from '../../helpers/Leakages/createLeakageAdapters';
import Leakages from '../Leakages/Leakages';
import { TempDir } from '../../helpers/TempDir';
import {
  ConversionToJupyter,
  ConversionToPython,
} from '../../helpers/conversion/LineConversion';

export const COMMAND = 'data-leakage.quickfix';

/**
 * Provides code actions corresponding to diagnostic problems.
 */
export class QuickFixManual implements vscode.CodeActionProvider {
  public static readonly ProvidedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public constructor(
    private readonly _context: vscode.ExtensionContext,
    private _internalLineMappings: Record<number, number>,
    private _invocationLineMappings: Record<string, number>,
    private _lineMetadataMappings: Record<number, Metadata>,
    private _trainTestMappings: Record<number, Set<number>>,
    private _taintMappings: Record<number, Taint>,
    private _variableEquivalenceMappings: Record<string, string>,
  ) {}

  public async getData(context: vscode.ExtensionContext): Promise<void> {
    if (vscode.window.activeNotebookEditor) {
      const fsPath = vscode.window.activeNotebookEditor.notebook.uri.fsPath;
      const tempDir = await TempDir.getTempDir(fsPath);
      let manager = null;

      try {
        manager = await ConversionToJupyter.convertJSONFile(
          tempDir.getAlgoJupyLineMappingPath(),
        );
      } catch (err) {
        console.error('Notebook has not been analyzed before.', err);
        throw new NotAnalyzedError('Notebook has not been analyzed before.');
      }

      const pythonFileTotalLines =
        ConversionToPython.convertJupyCellsToPythonCode(
          manager.getJupyCells(),
        ).split('\n').length;

      const leakages = new Leakages(
        tempDir.getAlgoOutputDirPath(),
        'input',
        pythonFileTotalLines,
      );
      this._internalLineMappings = await leakages.getInternalLineMappings();
      this._invocationLineMappings = await leakages.getInvocationLineMappings();
      this._lineMetadataMappings = await leakages.getLineMetadataMappings(
        this._internalLineMappings,
        this._invocationLineMappings,
      );
      this._trainTestMappings = await leakages.getTrainTestMappings(
        this._internalLineMappings,
        this._invocationLineMappings,
      );
      this._taintMappings = await leakages.getTaintMappings(
        this._internalLineMappings,
        this._invocationLineMappings,
      );
      this._variableEquivalenceMappings =
        await leakages.getVariableEquivalenceMappings();
      // const dataFlowMappings = await leakages.getDataFlowMappings();
    } else {
      throw new Error('No active notebook editor found.');
    }
  }

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const actions = context.diagnostics
      .filter((diagnostic) => diagnostic.code === LEAKAGE_ERROR)
      .flatMap((diagnostic) => [this.createFix(diagnostic, document)])
      .filter((fix) => !!fix);
    return actions;
  }

  private createFix(
    diagnostic: vscode.Diagnostic,
    document: vscode.TextDocument,
  ): vscode.CodeAction | null {
    const action = new vscode.CodeAction(
      'Leakage Quickfix Suggestion',
      vscode.CodeActionKind.QuickFix,
    );

    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    action.edit = new vscode.WorkspaceEdit();
    switch (diagnostic.source) {
      case LeakageType.OverlapLeakage:
        action.title = 'Use independent test data for evaluation.';
        this.tryResolveOverlap(
          action.edit,
          document,
          diagnostic.range.start.line + 1,
        );
        break;
      case LeakageType.PreProcessingLeakage:
        action.title = 'Move feature selection later.';
        this.tryResolvePreprocessing(
          action.edit,
          document,
          diagnostic.range.start.line + 1,
        );
        break;
      case LeakageType.MultiTestLeakage:
        action.title = 'Use independent test data for evaluation.';
        this.tryResolveMultiTest(
          action.edit,
          document,
          diagnostic.range.start.line + 1,
        );
        break;
    }

    return action;
  }

  private async tryResolveOverlap(
    edit: vscode.WorkspaceEdit,
    document: vscode.TextDocument,
    line: number,
  ) {
    const testingVariable = this._lineMetadataMappings[line].variable;
    const testingModel = this._lineMetadataMappings[line].model;

    const newX = `X_${testingVariable}_new`;
    const newY = `y_${testingVariable}_new`;
    const scoringModel = `${this._variableEquivalenceMappings[testingModel]}`;

    const newLoad = `${newX}, ${newY} = load_test_data()\n`;
    const newTransform = `${newX}_0 = transform_model.transform(${newX})\n`;
    const newScore = `${scoringModel}.score(${newX}_0, ${newY})`;

    const insert = `\n${newLoad}${newTransform}${newScore}`;

    edit.insert(
      document.uri,
      new vscode.Position(document.lineCount, 0),
      insert,
    );
  }

  private async tryResolvePreprocessing(
    edit: vscode.WorkspaceEdit,
    document: vscode.TextDocument,
    line: number,
  ) {
    const documentLines = document.getText().split('\n');
    let featureSelection = -1;

    for (let i = 0; i < document.lineCount; i++) {
      if (documentLines[i].match(/train_test_split/g)) {
        featureSelection = i;
      }
    }
    if (featureSelection === -1) {
      throw new Error('Feature selection method not found.');
    }

    const earliestTaintLine = Math.min(
      ...Object.keys(this._taintMappings).map((e) => parseInt(e)),
    );

    const selectionCode = documentLines[featureSelection];

    edit.delete(document.uri, document.lineAt(featureSelection).range);
    edit.insert(
      document.uri,
      new vscode.Position(earliestTaintLine - 2, 0),
      `\n${selectionCode}\n`,
    );
  }

  private async tryResolveMultiTest(
    edit: vscode.WorkspaceEdit,
    document: vscode.TextDocument,
    line: number,
  ) {
    const testingVariable = this._lineMetadataMappings[line].variable;
    const testingModel = this._lineMetadataMappings[line].model;

    const newX = `X_${testingVariable}_new`;
    const newY = `y_${testingVariable}_new`;
    const scoringModel = `${this._variableEquivalenceMappings[testingModel]}`;

    const newLoad = `${newX}, ${newY} = load_test_data()\n`;
    const newTransform = `${newX}_0 = transform_model.transform(${newX})\n`;
    const newScore = `${scoringModel}.score(${newX}_0, ${newY})`;

    const insert = `\n${newLoad}${newTransform}${newScore}`;

    edit.insert(
      document.uri,
      new vscode.Position(document.lineCount, 0),
      insert,
    );
  }
}
