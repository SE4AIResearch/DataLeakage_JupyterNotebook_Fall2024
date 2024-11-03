import { ExtensionContext } from 'vscode';
import LeakageUtilities from './LeakageUtilities';
import OverlapLeakageDetector from './LeakageDetector/OverlapLeakageDetector';
import PreprocessingLeakageDetector from './LeakageDetector/PreprocessingLeakageDetector';
import MultitestLeakageDetector from './LeakageDetector/MultitestLeakageDetector';
import LeakageInstance from './LeakageInstance/LeakageInstance';

/**
 * Main class responsible for getting all the leakage data.
 */
export default class Leakages {
  private leakageUtilities: LeakageUtilities;
  private leakageDetectors: [
    OverlapLeakageDetector,
    PreprocessingLeakageDetector,
    MultitestLeakageDetector,
  ];

  constructor(outputDirectory: string, extensionContext: ExtensionContext) {
    const textDecoder = new TextDecoder();

    this.leakageUtilities = new LeakageUtilities(
      outputDirectory,
      extensionContext,
      textDecoder,
    );
    this.leakageDetectors = [
      new OverlapLeakageDetector(
        outputDirectory,
        extensionContext,
        textDecoder,
      ),
      new PreprocessingLeakageDetector(
        outputDirectory,
        extensionContext,
        textDecoder,
      ),
      new MultitestLeakageDetector(
        outputDirectory,
        extensionContext,
        textDecoder,
      ),
    ];
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
    await this.leakageUtilities.readInvocationTrainTestMappings();
    await this.leakageUtilities.readTaintFile();

    for (const leakageDetector of this.leakageDetectors) {
      leakageDetector.addInformation(
        this.leakageUtilities.readFile,
        this.leakageUtilities.getInternalLineMappings(),
        this.leakageUtilities.getInvocationLineMappings(),
        this.leakageUtilities.getInvocationMetadataMappings(),
        this.leakageUtilities.getInvocationTrainTestMappings(),
        this.leakageUtilities.getTaints(),
      );
      leakageInstances.push(...(await leakageDetector.getLeakageInstances()));
    }

    return leakageInstances;
  }
}
