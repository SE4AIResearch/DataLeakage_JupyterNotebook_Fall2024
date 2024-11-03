import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import OverlapLeakageInstance from '../LeakageInstance/OverlapLeakageInstance';
import OverlapLeakageSource from '../LeakageSource/OverlapLeakageSource';
import { LeakageType, TaintType, type Metadata } from '../types';

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
    const overlapLeakageData: Record<
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
          trainingInvocation,
          trainingFunction,
          trainingContext,
          testingModel,
          testingVariable,
          testingInvocation,
          testingFunction,
          testingContext,
        ] = line.split('\t');

        if (!(trainingInvocation in this.invocationMetadataMappings)) {
          this.invocationMetadataMappings[trainingInvocation] = {
            model: trainingModel,
            variable: trainingVariable,
            function: trainingFunction,
            line: this.internalLineMappings[
              this.invocationLineMappings[trainingInvocation]
            ],
          };
        }
        if (!(testingInvocation in this.invocationMetadataMappings)) {
          this.invocationMetadataMappings[testingInvocation] = {
            model: testingModel,
            variable: testingVariable,
            function: testingFunction,
            line: this.internalLineMappings[
              this.invocationLineMappings[testingInvocation]
            ],
          };
        }

        if (!(trainingInvocation in this.invocationTrainTestMappings)) {
          this.invocationTrainTestMappings[trainingInvocation] = new Set();
        }
        this.invocationTrainTestMappings[trainingInvocation].add(
          testingInvocation,
        );

        const hash = this.hash(trainingInvocation, testingInvocation);

        overlapLeakageData[hash] = {
          training: this.invocationMetadataMappings[trainingInvocation],
          testing: this.invocationMetadataMappings[testingInvocation],
        };
      });

    for (const data of Object.values(overlapLeakageData)) {
      overlapLeakageInstances.push(
        new OverlapLeakageInstance(
          data.training,
          data.testing,
          new OverlapLeakageSource(
            this.taints.filter((source) => source.getType() === TaintType.Dup),
          ),
        ),
      );
    }

    return overlapLeakageInstances;
  }

  private hash(trainingInvocation: string, testingInvocation: string) {
    return `${trainingInvocation}_${testingInvocation}`;
  }
}
