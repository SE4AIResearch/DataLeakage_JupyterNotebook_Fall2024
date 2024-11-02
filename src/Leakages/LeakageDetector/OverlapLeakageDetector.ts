import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import OverlapLeakageInstance from '../LeakageInstance/OverlapLeakageInstance';
import OverlapLeakageSource from '../LeakageSource/OverlapLeakageSource';
import { LeakageType, type Metadata } from '../types';

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
      LeakageType.OverlapLeakage,
    );
  }

  async getLeakageInstances(): Promise<OverlapLeakageInstance[]> {
    const overlapLeakageInstances: OverlapLeakageInstance[] = [];
    const leakageMetadatas: Record<
      string,
      {
        training: Metadata;
        testing: Metadata;
      }
    > = {};

    const leakagesFile = await this.readFile('Telemetry_OverlapLeak.csv');
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
      overlapLeakageInstances.push(
        new OverlapLeakageInstance(
          metadata.training,
          metadata.testing,
          new OverlapLeakageSource(this.taints),
        ),
      );
    }

    return overlapLeakageInstances;
  }

  private hash(
    trainingInvocationString: string,
    testingInvocationString: string,
  ) {
    return `${trainingInvocationString}_${testingInvocationString}`;
  }
}
