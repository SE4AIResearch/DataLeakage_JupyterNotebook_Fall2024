import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import LeakageInstance from '../LeakageInstance/LeakageInstance';
import {
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
  private outputDirectory: string;
  private extensionContext: vscode.ExtensionContext;
  private textDecoder: TextDecoder;

  protected leakageType: LeakageType;
  protected leakageInstances: SpecificLeakageInstance[];

  protected readFile: (filename: string) => Promise<string[]> = async () => [];
  protected internalLineMappings: Record<number, number> = {};
  protected invocationLineMappings: Record<string, number> = {};
  protected taints: Taint[] = [];

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

  addInformation(
    readFile: (filename: string) => Promise<string[]>,
    internalLineMappings: InternalLineMappings,
    invocationLineMappings: InvocationLineMappings,
    taints: Taint[],
  ): void {
    this.readFile = readFile;
    this.internalLineMappings = internalLineMappings;
    this.invocationLineMappings = invocationLineMappings;
    this.taints = taints;
  }

  getLeakageType(): LeakageType {
    return this.leakageType;
  }

  abstract getLeakageInstances(): Promise<SpecificLeakageInstance[]>;
}
