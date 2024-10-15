import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import LeakageInstance from '../LeakageInstance/LeakageInstance';
import {
  InternalLineMappings,
  InvocationFunctionMappings,
  InvocationLineMappings,
  Leakage,
} from '../types';

/**
 * Base class for all leakage detectors.
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

  protected leakageType: Leakage;
  protected leakageInstances: SpecificLeakageInstance[];

  protected internalLineMappings: Record<number, number> = {};
  protected invocationLineMappings: Record<string, number> = {};
  // protected invocationFunctionMappings: Record<string, string> = {};

  constructor(
    outputDirectory: string,
    extensionContext: vscode.ExtensionContext,
    textDecoder: TextDecoder,
    leakageType: Leakage,
  ) {
    this.outputDirectory = outputDirectory;
    this.extensionContext = extensionContext;
    this.textDecoder = textDecoder;

    this.leakageType = leakageType;
    this.leakageInstances = [];
  }

  getLeakageType(): Leakage {
    return this.leakageType;
  }

  addMappings(
    internalLineMappings: InternalLineMappings,
    invocationLineMappings: InvocationLineMappings,
    // invocationFunctionMappings: InvocationFunctionMappings,
  ): void {
    this.internalLineMappings = internalLineMappings;
    this.invocationLineMappings = invocationLineMappings;
    // this.invocationFunctionMappings = invocationFunctionMappings;
  }

  abstract getLeakageInstances(): Promise<SpecificLeakageInstance[]>;

  addLeakageInstance(leakageInstance: SpecificLeakageInstance): void {
    this.leakageInstances.push(leakageInstance);
  }

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
