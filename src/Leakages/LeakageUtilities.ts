import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import {
  InternalLineMappings,
  InvocationFunctionMappings,
  InvocationLineMappings,
  LeakageSourceInfo,
} from './types';

export default class LeakageUtilities {
  private outputDirectory: string;
  private extensionContext: vscode.ExtensionContext;
  private textDecoder: TextDecoder;

  private internalLineMappings: InternalLineMappings = {};
  private invocationLineMappings: InvocationLineMappings = {};
  private invocationFunctionMappings: InvocationFunctionMappings = {};

  constructor(
    outputDirectory: string,
    extensionContext: vscode.ExtensionContext,
    textDecoder: TextDecoder,
  ) {
    this.outputDirectory = outputDirectory;
    this.extensionContext = extensionContext;
    this.textDecoder = textDecoder;
  }

  getInternalLineMappings(): InternalLineMappings {
    return this.internalLineMappings;
  }

  getInvocationLineMappings(): InvocationLineMappings {
    return this.invocationLineMappings;
  }

  getInvocationFunctionMappings(): InvocationFunctionMappings {
    return this.invocationFunctionMappings;
  }

  /**
   * Looks through 'LinenoMapping.facts' to find all the mappings from internal line number to the actual line number.
   * The internal line number is the line number used by the program.
   * The actual line number is the line number of the end user's code.
   */
  public async readInternalLineMappings(): Promise<void> {
    const internalLineMappings: InternalLineMappings = {};

    const file = await this.readFile('LinenoMapping.facts');
    file.forEach((line) => {
      const [internalLine, actualLine] = line.split('\t');
      internalLineMappings[parseInt(internalLine)] = parseInt(actualLine);
    });

    this.internalLineMappings = internalLineMappings;
  }

  /**
   * Looks through 'InvokeLineno.facts' to find all the mappings from invocation to internal line number.
   */
  public async readInvocationLineMappings(): Promise<void> {
    const invocationLineMappings: InvocationLineMappings = {};

    const file = await this.readFile('InvokeLineno.facts');
    file.forEach((line) => {
      const [invocationString, internalLine] = line.split('\t');
      invocationLineMappings[invocationString] = parseInt(internalLine);
    });

    this.invocationLineMappings = invocationLineMappings;
  }

  /**
   * Looks through 'Invoke.facts' to find all the mappings from invocation to function.
   */
  public async readInvocationFunctionMappings(): Promise<void> {
    const invocationFunctionMappings: InvocationFunctionMappings = {};

    const file = await this.readFile('Invoke.facts');
    file.forEach((line) => {
      const [invocationString, func] = line.split('\t');
      invocationFunctionMappings[invocationString] = func;
    });

    this.invocationFunctionMappings = invocationFunctionMappings;
  }

  public async readTaintFile(): Promise<void> {
    // const file = await this.readFile('TaintStartsTarget.csv');
    // const invocationMappings: Record<string, LeakageSourceInfo> = {};
    // file.forEach((line) => {
    //   const [
    //     leakageDestination,
    //     leakageDestinationContext,
    //     leakageSource,
    //     leakageSourceContext,
    //     leakageSourceInvocationString,
    //     leakageSourceFunction,
    //     leakageSourceType,
    //   ] = line.split('\t');
    //   invocationMappings[leakageSourceInvocationString] = {
    //     leakageSource: leakageSource,
    //     leakageSourceFunction: leakageSourceFunction,
    //     leakageSourceLine: this.internalLineMappings.
    //   };
    // });
  }

  public async readFile(filename: string): Promise<string[]> {
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
