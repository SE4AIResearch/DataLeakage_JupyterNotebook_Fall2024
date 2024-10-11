import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import PreprocessingLeakageInstance from '../LeakageInstance/PreprocessingLeakageInstance';
import { Leakage } from '../types';

export default class PreprocessingLeakageDetector extends LeakageDetector<PreprocessingLeakageInstance> {
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

  async getLeakageInstances(): Promise<PreprocessingLeakageInstance[]> {
    const preprocessingLeakageInstances: PreprocessingLeakageInstance[] = [];

    const file = await this.readFile('Telemetry_FinalPreProcessingLeak.csv');
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
        leakageDestination,
        leakageSource,
      ] = line.split('\t');

      preprocessingLeakageInstances.push(
        new PreprocessingLeakageInstance(
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

    return preprocessingLeakageInstances;
  }
}
