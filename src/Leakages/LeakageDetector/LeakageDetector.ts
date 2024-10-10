import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import LeakageInstance from '../LeakageInstance/LeakageInstance';
import { LeakageType } from '../types';

/**
 * Abstract class for all leakage detectors.
 *
 * Responsible for getting all the relevant information about its respective leakage type.
 */
export default abstract class LeakageDetector<
  SpecificLeakageInstance extends LeakageInstance,
> implements LeakageDetector<SpecificLeakageInstance>
{
  private outputDirectory: string;
  private extensionContext: vscode.ExtensionContext;
  private textDecoder: TextDecoder;

  protected leakageType: LeakageType;
  protected leakageInstances: SpecificLeakageInstance[];

  protected internalLineMappings: Record<number, number> = {};
  protected invocationLineMappings: Record<string, number> = {};
  protected invocationFunctionMappings: Record<string, string> = {};

  constructor(
    outputDirectory: string,
    extensionContext: vscode.ExtensionContext,
    textDecoder: TextDecoder,
    leakageType: LeakageType,
  ) {
    this.outputDirectory = outputDirectory;
    this.extensionContext = extensionContext;
    this.textDecoder = textDecoder;

    this.leakageType = leakageType;
    this.leakageInstances = [];
  }

  getLeakageType(): LeakageType {
    return this.leakageType;
  }

  addMappings(
    internalLineMappings: Record<number, number>,
    invocationLineMappings: Record<string, number>,
    invocationFunctionMappings: Record<string, string>,
  ): void {
    this.internalLineMappings = internalLineMappings;
    this.invocationLineMappings = invocationLineMappings;
    this.invocationFunctionMappings = invocationFunctionMappings;
  }

  addLeakageInstance(leakageInstance: SpecificLeakageInstance): void {
    this.leakageInstances.push(leakageInstance);
  }

  abstract getLeakageInstances(): Promise<SpecificLeakageInstance[]>;

  protected async readFile(filename: string): Promise<string[]> {
    const filepath = this.extensionContext.asAbsolutePath(
      this.outputDirectory + filename,
    );
    const bytes = await vscode.workspace.fs.readFile(
      vscode.Uri.parse('file://' + filepath),
    );
    return this.textDecoder
      .decode(bytes)
      .split('\n')
      .filter((line) => !!line);
  }
}
