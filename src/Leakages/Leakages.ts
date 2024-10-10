import { ExtensionContext } from 'vscode';
import OverlapLeakageDetector from './LeakageDetector/OverlapLeakageDetector';
import LeakageDetector from './LeakageDetector/LeakageDetector';
import LeakageInstance from './LeakageInstance/LeakageInstance';
import LeakageUtilities from './LeakageUtilities';

/**
 * Main class responsible for getting all the leakage data.
 */
export default class Leakages {
  private leakageDetectors: LeakageDetector<any>[];
  private leakageUtilities: LeakageUtilities;

  constructor(outputDirectory: string, extensionContext: ExtensionContext) {
    const textDecoder = new TextDecoder();

    this.leakageDetectors = [
      new OverlapLeakageDetector(
        outputDirectory,
        extensionContext,
        textDecoder,
      ),
    ];
    this.leakageUtilities = new LeakageUtilities(
      outputDirectory,
      extensionContext,
      textDecoder,
    );
  }

  /**
   * Goes through all the leakage detectors and runs each of their respective methods to get an array of all the
   * leakages within the program.
   *
   * @returns An array of all the leakages in the program.
   */
  async getLeakages(): Promise<LeakageInstance[]> {
    const leakageInstances: LeakageInstance[] = [];

    await this.leakageUtilities.readInternalLineMappings();
    await this.leakageUtilities.readInvocationLineMappings();
    await this.leakageUtilities.readInvocationFunctionMappings();

    for (const leakageDetector of this.leakageDetectors) {
      leakageDetector.addMappings(
        this.leakageUtilities.getInternalLineMappings(),
        this.leakageUtilities.getInvocationLineMappings(),
        this.leakageUtilities.getInvocationFunctionMappings(),
      );
      leakageInstances.push(...(await leakageDetector.getLeakageInstances()));
    }

    return leakageInstances;
  }
}
