import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import {
  TaintType,
  type InternalLineMappings,
  type InvocationFunctionMappings,
  type InvocationLineMappings,
} from './types';
import Taint from './LeakageSource/Taint';

export default class LeakageUtilities {
  private outputDirectory: string;
  private extensionContext: vscode.ExtensionContext;
  private textDecoder: TextDecoder;

  private internalLineMappings: InternalLineMappings = {};
  private invocationLineMappings: InvocationLineMappings = {};
  private invocationFunctionMappings: InvocationFunctionMappings = {};
  private taints: Taint[] = [];

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

  getTaints(): Taint[] {
    return this.taints;
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

  /**
   * Looks through 'TaintStartTarget.csv' to find all the taints.
   */
  public async readTaintFile(): Promise<void> {
    const taints: Taint[] = [];

    if (!this.internalLineMappings) {
      await this.readInternalLineMappings();
    }
    if (!this.invocationLineMappings) {
      await this.readInvocationLineMappings();
    }

    const taintsFile = await this.readFile('TaintStartsTarget.csv');
    taintsFile
      .filter((line) => !!line)
      .forEach((line) => {
        const [
          destinationVariable,
          _,
          sourceVariable,
          __,
          sourceInvocationString,
          sourceFunction,
          taintType,
        ] = line.split('\t');

        if (
          !(
            taintType === 'dup' ||
            taintType === 'rowset' ||
            taintType === 'unknown'
          )
        ) {
          throw new Error('Unrecognized taint type.');
        }

        taints.push(
          new Taint(
            taintType as TaintType,
            destinationVariable,
            sourceVariable,
            sourceFunction,
            this.internalLineMappings[
              this.invocationLineMappings[sourceInvocationString]
            ],
          ),
        );
      });

    this.taints = taints;
  }

  /**
   * Reads a file that is located inside the output directory.
   * @param filename The name of the file to be read.
   * @returns An array containing the lines inside the file.
   */
  public async readFile(filename: string): Promise<string[]> {
    const filepath = this.extensionContext.asAbsolutePath(
      this.outputDirectory + filename,
    );
    const bytes = await vscode.workspace.fs.readFile(
      vscode.Uri.parse('file://' + filepath),
    );
    return this.textDecoder.decode(bytes).split('\n');
  }
}
