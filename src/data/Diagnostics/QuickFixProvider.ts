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

      return new QuickFixProvider(
        context,
        internalLineMappings,
        invocationLineMappings,
        lineMetadataMappings,
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
        break;
      case LeakageType.PreProcessingLeakage:
        action.title = 'Move feature selection later.';
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

  private async tryResolveMultiTest(
    edit: vscode.WorkspaceEdit,
    document: vscode.TextDocument,
    line: number,
  ) {
    console.log(line, this._lineMetadataMappings);

    const insert = `\n`;

    edit.insert(
      document.uri,
      new vscode.Position(document.lineCount, 0),
      insert,
    );
  }
}
export function deactivate() {}
