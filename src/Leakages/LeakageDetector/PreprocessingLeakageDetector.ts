import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import PreprocessingLeakageInstance from '../LeakageInstance/PreprocessingLeakageInstance';
import {
  Leakage,
  PreprocessingLeakageTestingInfo,
  PreprocessingLeakageTrainingInfo,
} from '../types';

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
    const leakageSourceMappings: Record<
      string,
      {
        training: PreprocessingLeakageTrainingInfo;
        testing: PreprocessingLeakageTestingInfo;
      }
    > = {};
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
        leakageDestination, // TODO - Not 100% on this
        leakageSource, // TODO - Not 100% on this
      ] = line.split('\t');

      leakageSourceMappings[leakageSource] = {
        training: {
          model: trainingModel,
          variable: trainingVariable,
          trainingFunction: trainingFunction,
          line: this.internalLineMappings[
            this.invocationLineMappings[trainingInvocationString]
          ],
        },
        testing: {
          model: testingModel,
          variable: testingVariable,
          testingFunction: testingFunction,
          line: this.internalLineMappings[
            this.invocationLineMappings[testingInvocationString]
          ],
        },
      };
    });

    for (const [leakageSource, info] of Object.entries(leakageSourceMappings)) {
      preprocessingLeakageInstances.push(
        new PreprocessingLeakageInstance(
          leakageSource,
          info.training,
          info.testing,
        ),
      );
    }

    return preprocessingLeakageInstances;
  }

  async getLeakageSources(): Promise<any> {
    throw new Error('Method not implemented.');
  }
}
