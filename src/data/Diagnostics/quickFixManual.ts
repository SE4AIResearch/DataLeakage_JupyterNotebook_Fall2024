import * as vscode from 'vscode';
import { LeakageType, Metadata, Taint } from '../Leakages/types';
import { LEAKAGE_ERROR } from './notebookDiagnostics';
import { NotAnalyzedError } from '../../helpers/CustomError';
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
    private _variableEquivalenceMappings: Record<string, Set<string>>,
    private _dataFlowMappings: Record<string, Set<string>>,
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
      this._dataFlowMappings = await leakages.getDataFlowMappings(
        this._variableEquivalenceMappings,
      );
    } else {
      throw new Error('No active notebook editor found.');
    }
  }

  public provideCodeActions(
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

    // Step 1: Locate the feature selection line
    let featureSelectionLine = -1;
    for (let i = 0; i < document.lineCount; i++) {
      if (documentLines[i].match(/train_test_split/g)) {
        featureSelectionLine = i;
      }
    }
    if (featureSelectionLine === -1) {
      throw new Error(
        "Feature selection method not found. Looking for 'train_test_split' method.",
      );
    }

    let featureSelectionCode = documentLines[featureSelectionLine];
    let endLine = featureSelectionLine;

    const getParenthesesCount = (str: string) => {
      let count = 0;
      let inQuote = false;
      for (const char of str) {
        if (char === '"' || char === "'") {
          inQuote = !inQuote;
        }
        if (char === '(' && !inQuote) {
          count++;
        } else if (char === ')' && !inQuote) {
          count--;
        }
      }
      return count;
    };

    let runningCount = getParenthesesCount(featureSelectionCode.trim());
    while (runningCount !== 0) {
      endLine++;
      featureSelectionCode += '\n' + documentLines[endLine];
      runningCount += getParenthesesCount(documentLines[endLine].trim());
    }

    // Step 2: Validate and parse feature selection variables
    const featureVariables = featureSelectionCode.split('=')[0].split(',');
    // if (featureVariables.length < 4) {
    //   throw new Error(
    //     "Invalid feature selection code. Expected format: 'X_train, X_test, y_train, y_test = train_test_split(...)'",
    //   );
    // }

    const [X_train, X_test, y_train, y_test] = featureVariables.map((e) =>
      e.trim(),
    );

    const genTempVarName = (varName: string) => {
      let temp_name = `${X_train}_0`;
      while (temp_name in this._dataFlowMappings) {
        temp_name += '0';
      }
      return temp_name;
    };

    const temp_X_train = genTempVarName(X_train);
    const temp_X_test = genTempVarName(X_test);
    const updatedFeatureSelectionCode = featureSelectionCode
      .replace(X_train, temp_X_train)
      .replace(X_test, temp_X_test);

    // Step 3: Find the earliest taint line
    const taintLines = Object.keys(this._taintMappings).map((e) => parseInt(e));
    if (taintLines.length === 0) {
      throw new Error('No taint mappings found for preprocessing.');
    }
    const earliestTaintLine = Math.min(...taintLines);
    if (earliestTaintLine > featureSelectionLine) {
      throw new Error(
        'No taint mappings found before the feature selection line.',
      );
    }
    const taint = this._taintMappings[earliestTaintLine];
    const regexMatch = /(.*)_\d+/g.exec(taint.destVariable);
    const preprocessor = regexMatch ? regexMatch[1] : taint.destVariable;
    const preprocessingFit = new RegExp(
      `(?:^|\\s*)${preprocessor}\\s*\\.\\s*fit\\s*\\(\\s*([^\\s)]+)\\s*\\)`,
      'g',
    );
    const preprocessingTransform = new RegExp(
      `^\\s*(\\w+)\\s*=\\s*${preprocessor}\\s*\\.\\s*transform\\s*\\(\\s*(\\w+)\\s*\\)`,
      'g',
    );

    // Step 4: Update the code related to preprocessing leakage
    let matchedFit = false;
    let matchedTransform = false;
    for (let i = earliestTaintLine - 2; i < featureSelectionLine; i++) {
      if (documentLines[i].includes(preprocessor)) {
        const matchFit = preprocessingFit.exec(documentLines[i]);
        if (matchFit) {
          matchedFit = true;
          edit.replace(
            document.uri,
            document.lineAt(i).range,
            documentLines[i].replace(matchFit[1], `${temp_X_train}`),
          );
          continue;
        }

        const matchTransform = preprocessingTransform.exec(documentLines[i]);
        if (matchTransform) {
          matchedTransform = true;
          const updatedTransform = documentLines[i]
            .replace(matchTransform[1], `${X_train}`)
            .replace(matchTransform[2], `${temp_X_train}`);
          const newTransform = documentLines[i]
            .replace(matchTransform[1], `${X_test}`)
            .replace(matchTransform[2], `${temp_X_test}`);

          edit.replace(
            document.uri,
            document.lineAt(i).range,
            updatedTransform,
          );
          edit.insert(
            document.uri,
            new vscode.Position(i + 1, 0),
            newTransform,
          );
          continue;
        }
      }
    }

    edit.delete(
      document.uri,
      new vscode.Range(
        document.lineAt(featureSelectionLine).range.start,
        document.lineAt(endLine).range.end,
      ),
    );
    edit.insert(
      document.uri,
      new vscode.Position(earliestTaintLine - 2, 0),
      `${updatedFeatureSelectionCode}\n`,
    );
    if (!matchedFit) {
      edit.insert(
        document.uri,
        new vscode.Position(earliestTaintLine + 1, 0),
        `fit_model.fit(${temp_X_train})\n`,
      );
    }
    if (!matchedTransform) {
      edit.insert(
        document.uri,
        new vscode.Position(earliestTaintLine + 1, 0),
        `${X_train} = transform_model.transform(${temp_X_train})\n${X_test} = transform_model.transform(${temp_X_test})\n`,
      );
    }
  }

  private async tryResolveMultiTest(
    edit: vscode.WorkspaceEdit,
    document: vscode.TextDocument,
    line: number,
  ) {
    const documentLines = document.getText().split('\n');

    const testingVariable = this._lineMetadataMappings[line].variable;
    const testingModel = this._lineMetadataMappings[line].model;
    const equivalentModels = Array.from(
      this._variableEquivalenceMappings[testingModel],
    );
    const lastEquivalentModel = equivalentModels[equivalentModels.length - 1];

    const newX = `X_${testingVariable}_new`;
    const newY = `y_${testingVariable}_new`;
    let transformingModel = 'transform_model';
    for (let i = 0; i < document.lineCount; i++) {
      const regex = /\bselect(?=\s*\.\s*transform\s*\()/g;
      const regexMatch = regex.exec(documentLines[i]);
      if (regexMatch) {
        transformingModel = regexMatch[0];
        break;
      }
    }
    const scoringModel = `${lastEquivalentModel}`;

    const newLoad = `${newX}_0, ${newY} = load_test_data()\n`;
    const newTransform = `${newX} = ${transformingModel}.transform(${newX}_0)\n`;
    const newScore = `${scoringModel}.score(${newX}_0, ${newY})`;

    const independentTestData = `\n${newLoad}${newTransform}${newScore}`;

    edit.insert(
      document.uri,
      new vscode.Position(document.lineCount, 0),
      independentTestData,
    );
  }
}
