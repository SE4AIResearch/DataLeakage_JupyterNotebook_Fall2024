import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import Invocation from './LeakageInstance/Invocation';

export default class LeakageUtilities {
  private outputDirectory: string;
  private extensionContext: vscode.ExtensionContext;
  private textDecoder: TextDecoder;

  private internalLineMappings: Record<number, number> = {};
  private invocationLineMappings: Record<string, number> = {};
  private invocationFunctionMappings: Record<string, string> = {};

  constructor(
    outputDirectory: string,
    extensionContext: vscode.ExtensionContext,
    textDecoder: TextDecoder,
  ) {
    this.outputDirectory = outputDirectory;
    this.extensionContext = extensionContext;
    this.textDecoder = textDecoder;
  }

  getInternalLineMappings(): Record<number, number> {
    return this.internalLineMappings;
  }

  getInvocationLineMappings(): Record<string, number> {
    return this.invocationLineMappings;
  }

  getInvocationFunctionMappings(): Record<string, string> {
    return this.invocationFunctionMappings;
  }

  /**
   * Looks through 'LinenoMapping.facts' to find all the mappings from internal line number to the actual line number.
   * The internal line number is the line number used by the program.
   * The actual line number is the line number of the end user's code.
   */
  public async readInternalLineMappings(): Promise<void> {
    const data = await this.readFile('LinenoMapping.facts');
    const internalLineMappings: Record<number, number> = {};
    data.forEach((line) => {
      const [internalLine, actualLine] = line.split('\t');
      internalLineMappings[parseInt(internalLine)] = parseInt(actualLine);
    });
    this.internalLineMappings = internalLineMappings;
  }

  /**
   * Looks through 'InvokeLineno.facts' to find all the mappings from invocation to internal line number.
   */
  public async readInvocationLineMappings(): Promise<void> {
    const data = await this.readFile('InvokeLineno.facts');
    const invocationLineMappings: Record<string, number> = {};
    data.forEach((line) => {
      const [invocationString, internalLine] = line.split('\t');
      invocationLineMappings[invocationString] = parseInt(internalLine);
    });
    this.invocationLineMappings = invocationLineMappings;
  }

  /**
   * Looks through 'Invoke.facts' to find all the mappings from invocation to function.
   */
  public async readInvocationFunctionMappings(): Promise<void> {
    const data = await this.readFile('Invoke.facts');
    const invocationFunctionMappings: Record<string, string> = {};
    data.forEach((line) => {
      const [invocationString, func] = line.split('\t');
      invocationFunctionMappings[invocationString] = func;
    });
    this.invocationFunctionMappings = invocationFunctionMappings;
  }

  private async readFile(filename: string): Promise<string[]> {
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
