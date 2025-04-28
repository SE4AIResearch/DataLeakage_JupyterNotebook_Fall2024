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
        action.title = 'Separate training and test data.';
        this.tryResolveOverlap(
          action.edit,
          document,
          diagnostic.range.start.line,
        );
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
          diagnostic.range.start.line,
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
    const documentLines = document.getText().split('\n');

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

    const featureVariables = featureSelectionCode.split('=')[0].split(',');

    let [X_train, X_test, y_train, y_test] = featureVariables.map((e) =>
      e.trim(),
    );

    const dupTaints = Object.keys(this._taintMappings)
      .filter((key) => this._taintMappings[parseInt(key)].label === 'dup')
      .map(parseInt);
    if (dupTaints.length > 0) {
      const taintLineNumber = dupTaints[0];
      const taintLine = documentLines[taintLineNumber - 1];
      const resamplerRegex =
        /(\w+)\s*,\s*(\w+)\s*=\s*(\w+)\.fit_resample\(\s*(\w+)\s*,\s*(\w+)\s*\)/g;
      const match = resamplerRegex.exec(taintLine);
      if (!match) {
        throw new Error('Unable to match fit_resample.');
      }

      const [_, X_resampled, y_resampled, __, X, y] = match;

      const updatedTrainTest = featureSelectionCode
        .replace(X_resampled, X)
        .replace(y_resampled, y);
      const updatedTaintLine = taintLine.replace(
        /(\.\s*fit_resample\s*\(\s*)(\w+)(\s*,\s*)(\w+)(\s*\))/,
        (_, before, firstParam, middle, secondParam, after) =>
          `${before}${firstParam === 'X' ? 'X_train' : firstParam}${middle}${secondParam === 'y' ? 'y_train' : secondParam}${after}`,
      );

      edit.insert(
        document.uri,
        new vscode.Position(taintLineNumber - 1, 0),
        `${updatedTrainTest}\n`,
      );
      edit.replace(
        document.uri,
        document.lineAt(taintLineNumber - 1).range,
        `${updatedTaintLine}\n`,
      );
      edit.delete(document.uri, document.lineAt(taintLineNumber).range);

      X_train = X_resampled;
      y_train = y_resampled;
    }

    const offendingLine = document.lineAt(line).text;
    const regex = /\w+\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g;
    const regexExec = regex.exec(offendingLine);
    if (!regexExec) {
      throw new Error('Unable to match two parameters in the line.');
    }
    const [_, X, y] = regexExec;

    const updatedLine = offendingLine.replace(X, X_train).replace(y, y_train);
    edit.replace(document.uri, document.lineAt(line).range, updatedLine);
  }

  private async tryResolvePreprocessing(
    edit: vscode.WorkspaceEdit,
    document: vscode.TextDocument,
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
      let temp_name = `${varName}_0`;
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
    const taintLines = Object.keys(this._taintMappings).map(parseInt);
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

    const testingVariable = this._lineMetadataMappings[line + 1].variable;
    const testingModel = this._lineMetadataMappings[line + 1].model;
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
