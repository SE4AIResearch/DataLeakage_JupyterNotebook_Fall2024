import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import PreprocessingLeakageInstance from '../LeakageInstance/PreprocessingLeakageInstance';
import PreprocessingLeakageSource from '../LeakageSource/PreprocessingLeakageSource';
import { LeakageType, type Metadata } from '../types';

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
      LeakageType.OverlapLeakage,
    );
  }

  async getLeakageInstances(): Promise<PreprocessingLeakageInstance[]> {
    const preprocessingLeakageInstances: PreprocessingLeakageInstance[] = [];
    const leakageMetadatas: Record<
      string,
      {
        training: Metadata;
        testing: Metadata;
      }
    > = {};

    const leakagesFile = await this.readFile(
      'Telemetry_FinalPreProcessingLeak.csv',
    );
    leakagesFile
      .filter((line) => !!line)
      .forEach((line) => {
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
          destinationVariable,
          sourceVariable,
        ] = line.split('\t');

        const hash = this.hash(
          trainingInvocationString,
          testingInvocationString,
        );

        leakageMetadatas[hash] = {
          training: {
            model: trainingModel,
            variable: trainingVariable,
            function: trainingFunction,
            line: this.internalLineMappings[
              this.invocationLineMappings[trainingInvocationString]
            ],
          },
          testing: {
            model: testingModel,
            variable: testingVariable,
            function: testingFunction,
            line: this.internalLineMappings[
              this.invocationLineMappings[testingInvocationString]
            ],
          },
        };
      });

    for (const [_, metadata] of Object.entries(leakageMetadatas)) {
      preprocessingLeakageInstances.push(
        new PreprocessingLeakageInstance(
          metadata.training,
          metadata.testing,
          new PreprocessingLeakageSource(this.taints),
        ),
      );
    }

    return preprocessingLeakageInstances;
  }

  private hash(
    trainingInvocationString: string,
    testingInvocationString: string,
  ) {
    return `${trainingInvocationString}_${testingInvocationString}`;
  }
}
