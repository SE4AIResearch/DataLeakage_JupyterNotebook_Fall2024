import * as vscode from 'vscode';
import { LeakageType, Metadata } from '../Leakages/types';
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
export class QuickFixProvider implements vscode.CodeActionProvider {
  public static readonly ProvidedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  private constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly _internalLineMappings: Record<number, number>,
    private readonly _invocationLineMappings: Record<string, number>,
    private readonly _lineMetadataMappings: Record<number, Metadata>,
    private readonly _trainTestMappings: Record<number, Set<number>>,
    private readonly _variableEquivMappings: Record<string, string>,
  ) {}

  public static async create(
    context: vscode.ExtensionContext,
  ): Promise<QuickFixProvider> {
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
      const internalLineMappings = await leakages.getInternalLineMappings();
      const invocationLineMappings = await leakages.getInvocationLineMappings();
      const lineMetadataMappings = await leakages.getLineMetadataMappings(
        internalLineMappings,
        invocationLineMappings,
      );
      const trainTestMappings = await leakages.getTrainTestMappings(
        internalLineMappings,
        invocationLineMappings,
      );
      const variableEquivMappings = await leakages.getVariableEquivMappings();
      const dataFlowMappings = await leakages.getDataFlowMappings();
      console.log(dataFlowMappings);

      return new QuickFixProvider(
        context,
        internalLineMappings,
        invocationLineMappings,
        lineMetadataMappings,
        trainTestMappings,
        variableEquivMappings,
      );
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
    return context.diagnostics
      .filter((diagnostic) => diagnostic.code === LEAKAGE_ERROR)
      .map((diagnostic) => this.createFix(diagnostic, document))
      .filter((fix) => !!fix);
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
        action.title = 'Move feature selection later.';
        this.tryResolvePreprocessing(action.edit, document);
        break;
      case LeakageType.PreProcessingLeakage:
        action.title = 'Move feature selection later.';
        this.tryResolvePreprocessing(action.edit, document);
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

  private async tryResolvePreprocessing(
    edit: vscode.WorkspaceEdit,
    document: vscode.TextDocument,
  ) {
    const documentLines = document.getText().split('\n');
    let initLoad = -1;
    let featureSelection = -1;

    for (let i = 0; i < document.lineCount; i++) {
      if (documentLines[i].match(/load_data/g)) {
        initLoad = i;
      }
      if (documentLines[i].match(/train_test_split/g)) {
        featureSelection = i;
      }
    }
    if (initLoad === -1) {
      throw new Error('Load method not found.');
    }
    if (featureSelection === -1) {
      throw new Error('Feature selection method not found.');
    }

    const selectionCode = documentLines[featureSelection];
    edit.delete(document.uri, document.lineAt(featureSelection).range);
    edit.insert(
      document.uri,
      new vscode.Position(initLoad + 1, 0),
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
    const scoringModel = `${this._variableEquivMappings[testingModel]}`;

    const newLoad = `${newX}, ${newY} = load_test_data()\n`;
    const newTransform = `${newX}_0 = select.transform(${newX})\n`;
    const newScore = `${scoringModel}.score(${newX}_0, ${newY})`;

    const insert = `\n${newLoad}${newTransform}${newScore}`;

    edit.insert(
      document.uri,
      new vscode.Position(document.lineCount, 0),
      insert,
    );
  }
}
export function deactivate() {}
