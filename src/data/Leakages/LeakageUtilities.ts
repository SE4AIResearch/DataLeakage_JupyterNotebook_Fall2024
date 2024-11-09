import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import {
  TaintType,
  type InternalLineMappings,
  type InvocationLineMappings,
  type InvocationMetadataMappings,
  type InvocationTrainTestMappings,
} from './types';
import Taint from './LeakageSource/Taint';
import path from 'path';

/**
 * Utility class that generates info that is shared between all three leakage detectors types.
 */
export default class LeakageUtilities {
  private outputDirectory: string;
  private extensionContext: vscode.ExtensionContext;
  private textDecoder: TextDecoder;

  private internalLineMappings: InternalLineMappings = {};
  private invocationLineMappings: InvocationLineMappings = {};
  private invocationMetadataMappings: InvocationMetadataMappings = {};
  private invocationTrainTestMappings: InvocationTrainTestMappings = {};
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

  getInvocationMetadataMappings(): InvocationMetadataMappings {
    return this.invocationMetadataMappings;
  }

  getInvocationTrainTestMappings(): InvocationTrainTestMappings {
    return this.invocationTrainTestMappings;
  }

  getTaints(): Taint[] {
    return this.taints;
  }

  /**
   * File: Linenomapping.facts
   *
   * Maps internal line number to external line number.
   */
  public async readInternalLineMappings(): Promise<void> {
    const internalLineMappings: InternalLineMappings = {};

    const file = await this.readFile('LinenoMapping.facts');
    file
      .filter((line) => !!line)
      .forEach((line) => {
        const [internal, external] = line.split('\t');
        internalLineMappings[parseInt(internal)] = parseInt(external);
      });

    this.internalLineMappings = internalLineMappings;
  }

  /**
   * File: InvokeLineno.facts
   *
   * Maps invocation to internal line number.
   */
  public async readInvocationLineMappings(): Promise<void> {
    const invocationLineMappings: InvocationLineMappings = {};

    const file = await this.readFile('InvokeLineno.facts');
    file
      .filter((line) => !!line)
      .forEach((line) => {
        const [invocation, internal] = line.split('\t');
        invocationLineMappings[invocation] = parseInt(internal);
      });

    this.invocationLineMappings = invocationLineMappings;
  }

  /**
   * File: Telemetry_ModelPair.csv
   *
   * Adds any new invocation to metadata mappings.
   * Maps training invocation to testing invocations.
   */
  public async readInvocationTrainTestMappings(): Promise<void> {
    const invocationMetadataMappings: InvocationMetadataMappings = {};
    const invocationTrainTestMappings: InvocationTrainTestMappings = {};

    if (!this.internalLineMappings) {
      await this.readInternalLineMappings();
    }
    if (!this.invocationLineMappings) {
      await this.readInvocationLineMappings();
    }

    const file = await this.readFile('Telemetry_ModelPair.csv');
    file
      .filter((line) => !!line)
      .forEach((line) => {
        const [
          trainingModel,
          trainingVariable,
          trainingInvocation,
          trainingFunction,
          trainingContext,
          testingModel,
          testingVariable,
          testingInvocation,
          testingFunction,
          testingContext,
        ] = line.split('\t');

        invocationMetadataMappings[trainingInvocation] = {
          model: trainingModel,
          variable: trainingVariable,
          function: trainingFunction,
          line: this.internalLineMappings[
            this.invocationLineMappings[trainingInvocation]
          ],
        };
        invocationMetadataMappings[testingInvocation] = {
          model: testingModel,
          variable: testingVariable,
          function: testingFunction,
          line: this.internalLineMappings[
            this.invocationLineMappings[testingInvocation]
          ],
        };

        if (!(trainingInvocation in invocationTrainTestMappings)) {
          invocationTrainTestMappings[trainingInvocation] = new Set();
        }
        invocationTrainTestMappings[trainingInvocation].add(testingInvocation);
      });

    this.invocationMetadataMappings = {
      ...this.invocationMetadataMappings,
      ...invocationMetadataMappings,
    };
    this.invocationTrainTestMappings = invocationTrainTestMappings;
  }

  /**
   * File: TaintStartTarget.csv
   *
   * Gets all the taints.
   */
  public async readTaintFile(): Promise<void> {
    const taints: Taint[] = [];

    if (!this.internalLineMappings) {
      await this.readInternalLineMappings();
    }
    if (!this.invocationLineMappings) {
      await this.readInvocationLineMappings();
    }

    const file = await this.readFile('TaintStartsTarget.csv');
    file
      .filter((line) => !!line)
      .forEach((line) => {
        const [
          destinationVariable,
          destinationContext,
          sourceVariable,
          sourceContext,
          sourceInvocation,
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
              this.invocationLineMappings[sourceInvocation]
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
    const filepath = path.join(this.outputDirectory, filename);
    const bytes = await vscode.workspace.fs.readFile(
      vscode.Uri.parse('file://' + filepath),
    );
    return this.textDecoder.decode(bytes).split('\n');
  }
}
