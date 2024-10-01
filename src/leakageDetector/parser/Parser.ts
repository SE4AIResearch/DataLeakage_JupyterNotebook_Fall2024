import * as vscode from 'vscode';
import Invocation from './Invocation';
import { TextDecoder } from 'util';
import { LeakageTypes, TaintTypes, type OverlapLeakageInfo } from '../types';

export default class Parser {
  private outputDirPath: string;
  private context: vscode.ExtensionContext;
  private textDecoder: TextDecoder;

  private lineMappings: Record<number, number> = {};
  private invocations: Set<Invocation> = new Set();
  private invocationLineMappings: Record<string, number> = {};
  private invocationFunctionMapping: Record<string, string> = {};

  private leakageCache: Record<string, OverlapLeakageInfo> = {};

  constructor(outputDirPath: string, context: vscode.ExtensionContext) {
    this.outputDirPath = outputDirPath;
    this.context = context;
    this.textDecoder = new TextDecoder();
  }

  getInvocations(): Set<Invocation> {
    return this.invocations;
  }

  /**
   * Looks through the 'LinenoMapping.facts' file to find all the line mappings from internal line number to the actual
   * line number.
   * The internal line number is the line number used by the program.
   * The actual line number is the line number of the end user's code.
   */
  public async getLineMappings(): Promise<void> {
    const linenoMappingFactsFilePath = this.context.asAbsolutePath(
      this.outputDirPath + 'LinenoMapping.facts',
    );
    const linenoMappingFactsFileBytes = await vscode.workspace.fs.readFile(
      vscode.Uri.parse('file://' + linenoMappingFactsFilePath),
    );

    const lineMappings: Record<number, number> = {};
    this.textDecoder
      .decode(linenoMappingFactsFileBytes)
      .split('\n')
      .forEach((line) => {
        const [internalLine, actualLine] = line
          .split(/\s+/)
          .map((lineNumber) => parseInt(lineNumber));

        lineMappings[internalLine] = actualLine;
      });

    this.lineMappings = lineMappings;
  }

  /**
   * Looks through the 'InvokeLineno.facts' file to find all the invocation line mappings from invocation to internal
   * line number as well as through the 'Invoke.facts' file to find all the invocation function mappings from invocation
   * to function.
   */
  public async getInvocationDetails(): Promise<void> {
    const invokeLinenoFactsFilePath = this.context.asAbsolutePath(
      this.outputDirPath + 'InvokeLineno.facts',
    );
    const invokeLinenoFactsFileBytes = await vscode.workspace.fs.readFile(
      vscode.Uri.parse('file://' + invokeLinenoFactsFilePath),
    );
    const invokeFactsFilePath = this.context.asAbsolutePath(
      this.outputDirPath + 'Invoke.facts',
    );
    const invokeFactsFileBytes = await vscode.workspace.fs.readFile(
      vscode.Uri.parse('file://' + invokeFactsFilePath),
    );

    const invokeLinenoFactsFileLines = this.textDecoder
      .decode(invokeLinenoFactsFileBytes)
      .split('\n');
    const invokeFactsFileLines = this.textDecoder
      .decode(invokeFactsFileBytes)
      .split('\n');

    if (invokeLinenoFactsFileLines.length !== invokeFactsFileLines.length) {
      throw new Error('Mismatching number of invocations.');
    }

    const invocations: Set<Invocation> = new Set();
    const invocationLineMappings: Record<string, number> = {};
    const invocationFunctionMappings: Record<string, string> = {};

    for (let i = 0; i < invokeFactsFileLines.length; i++) {
      const [invocationStringA, lineMapping] =
        invokeLinenoFactsFileLines[i].split(/\s+/);
      const [invocationStringB, functionMapping] =
        invokeFactsFileLines[i].split(/\s+/);

      if (invocationStringA !== invocationStringB) {
        throw new Error('Mismatching invocation.');
      }

      const invocation = new Invocation(invocationStringA);
      invocationLineMappings[invocationStringA] = parseInt(lineMapping);
      invocationFunctionMappings[invocationStringA] = functionMapping;
      invocations.add(invocation);
    }

    this.invocations = invocations;
    this.invocationLineMappings = invocationLineMappings;
    this.invocationFunctionMapping = invocationFunctionMappings;
  }

  /**
   * Looks through the 'FinalOverlapLeak.csv' file to find all the instances of overlap leakages.
   */
  public async getOverlapLeakageInfo(): Promise<OverlapLeakageInfo> {
    let overlapLeakages = [];

    if (LeakageTypes.Overlap in this.leakageCache) {
      overlapLeakages = this.leakageCache[LeakageTypes.Overlap];
      return overlapLeakages;
    } else {
      const finalOverlapLeakCsvFilePath = this.context.asAbsolutePath(
        this.outputDirPath + 'FinalOverlapLeak.csv',
      );
      const finalOverlapLeakCsvFileBytes = await vscode.workspace.fs.readFile(
        vscode.Uri.parse('file://' + finalOverlapLeakCsvFilePath),
      );

      overlapLeakages = this.textDecoder
        .decode(finalOverlapLeakCsvFileBytes)
        .split('\n');
    }

    if (Object.keys(this.lineMappings).length === 0) {
      throw new Error('No line mappings.');
    }
    if (Object.keys(this.invocationLineMappings).length === 0) {
      throw new Error('No invocation line mappings.');
    }
    if (Object.keys(this.invocationFunctionMapping).length === 0) {
      throw new Error('No invocation function mappings.');
    }

    overlapLeakages = overlapLeakages
      .filter((e) => !!e)
      .map((leakage) => {
        const [c0, _, invocationString, c4] = leakage.split(/\s+/);

        if (!(invocationString in this.invocationLineMappings)) {
          throw new Error('A');
        }

        const internalLeakageLine =
          this.invocationLineMappings[invocationString];

        if (!(internalLeakageLine in this.lineMappings)) {
          throw new Error('B');
        }

        return {
          columnZero: c0,
          internalLine: internalLeakageLine,
          actualLine: this.lineMappings[internalLeakageLine],
          invocation: new Invocation(invocationString),
          columnFour: c4,
        };
      });

    this.leakageCache[LeakageTypes.Overlap] = overlapLeakages;
    return overlapLeakages;
  }

  /**
   * Looks through the 'TaintStartsTarget.csv' file to find all the instances of taint. A taint is defined as the source
   * of the leakage.
   */
  public async getLeakageSources(): Promise<string[]> {
    const filePath = this.context.asAbsolutePath(
      this.outputDirPath + 'TaintStartsTarget.csv',
    );
    const taintStartTargetsBytes = await vscode.workspace.fs.readFile(
      vscode.Uri.parse('file://' + filePath),
    );

    const taints: string[] = [];
    this.textDecoder
      .decode(taintStartTargetsBytes)
      .split('\n')
      .forEach((line) => {
        const [a, b, c, d, e, f, taintType] = line.split('\t');
        if (!Object.values(TaintTypes).includes(taintType as TaintTypes)) {
          throw new Error('Unrecognized taint type.');
        }
        taints.push(taintType);
      });

    return taints;
  }
}
