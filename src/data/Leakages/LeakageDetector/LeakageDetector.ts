import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import LeakageInstance from '../LeakageInstance/LeakageInstance';
import {
  InvocationMetadataMappings,
  InvocationTrainTestMappings,
  LeakageType,
  type InternalLineMappings,
  type InvocationLineMappings,
} from '../types';
import Taint from '../LeakageSource/Taint';

/**
 * Base class for all leakage detectors.
 *
 * Responsible for getting all the relevant information about its respective leakage type.
 */
export default abstract class LeakageDetector<
  SpecificLeakageInstance extends LeakageInstance,
> implements LeakageDetector<SpecificLeakageInstance>
{
  protected leakageType: LeakageType;

  private outputDirectory: string;
  private extensionContext: vscode.ExtensionContext;
  private textDecoder: TextDecoder;

  protected readFile: (filename: string) => Promise<string[]> = async () => [];
  protected internalLineMappings: Record<number, number> = {};
  protected invocationLineMappings: Record<string, number> = {};
  protected invocationMetadataMappings: InvocationMetadataMappings = {};
  protected invocationTrainTestMappings: InvocationTrainTestMappings = {};
  protected taints: Taint[] = [];

  constructor(
    outputDirectory: string,
    extensionContext: vscode.ExtensionContext,
    textDecoder: TextDecoder,
    leakageType: LeakageType,
  ) {
    this.leakageType = leakageType;

    this.outputDirectory = outputDirectory;
    this.extensionContext = extensionContext;
    this.textDecoder = textDecoder;
  }

  addInformation(
    readFile: (filename: string) => Promise<string[]>,
    internalLineMappings: InternalLineMappings,
    invocationLineMappings: InvocationLineMappings,
    invocationMetadataMappings: InvocationMetadataMappings,
    invocationTrainTestMappings: InvocationTrainTestMappings,
    taints: Taint[],
  ): void {
    this.readFile = readFile;
    this.internalLineMappings = internalLineMappings;
    this.invocationLineMappings = invocationLineMappings;
    this.invocationMetadataMappings = invocationMetadataMappings;
    this.invocationTrainTestMappings = invocationTrainTestMappings;
    this.taints = taints;
  }

  getLeakageType(): LeakageType {
    return this.leakageType;
  }

  abstract getLeakageInstances(): Promise<SpecificLeakageInstance[]>;
}
