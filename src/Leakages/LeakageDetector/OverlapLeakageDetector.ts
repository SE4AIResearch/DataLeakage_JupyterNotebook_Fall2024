import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import OverlapLeakageInstance from '../LeakageInstance/OverlapLeakageInstance';
import { Leakage } from '../types';

export default class OverlapLeakageDetector extends LeakageDetector<OverlapLeakageInstance> {
  constructor(
    outputDirectory: string,
    extensionContext: ExtensionContext,
    textDecoder: TextDecoder,
  ) {
    super(
      outputDirectory,
      extensionContext,
      textDecoder,
      Leakage.OverlapLeakage,
    );
  }

  async getLeakageInstances(): Promise<OverlapLeakageInstance[]> {
    const overlapLeakageInstances: OverlapLeakageInstance[] = [];

    const file = await this.readFile('Telemetry_OverlapLeak.csv');
    file.forEach((line) => {
      const [
        trainingModel,
        trainingVariable,
        trainingInvocationString,
        trainingFunction,
        trainingContext,
        testingModel,
        testingVariable,
        testingInvocationString,
        testingFunction,
        testingContext,
      ] = line.split('\t');

      overlapLeakageInstances.push(
        new OverlapLeakageInstance(
          {
            model: trainingModel,
            variable: trainingVariable,
            trainingFunction: trainingFunction,
            line: this.internalLineMappings[
              this.invocationLineMappings[trainingInvocationString]
            ],
          },
          {
            model: testingModel,
            variable: testingVariable,
            testingFunction: testingFunction,
            line: this.internalLineMappings[
              this.invocationLineMappings[testingInvocationString]
            ],
          },
        ),
      );
    });

    return overlapLeakageInstances;
  }
}
