import * as vscode from 'vscode';
import Parser from './parser/Parser';
import { type OverlapLeakageInfo } from './types';

export default class LeakageDetector {
  parser: Parser;

  constructor(outputDirPath: string, context: vscode.ExtensionContext) {
    this.parser = new Parser(outputDirPath, context);
  }

  /**
   * Gets all the found overlap leakages in a notebook.
   *
   * @returns An array containing overlap leakages.
   */
  public async getOverlapLeakage(): Promise<OverlapLeakageInfo> {
    await this.parser.getLineMappings();
    await this.parser.getInvocationDetails();
    return await this.parser.getOverlapLeakageInfo();
  }

  public async getLeakageSources(): Promise<string[]> {
    return await this.parser.getLeakageSources();
  }
}
