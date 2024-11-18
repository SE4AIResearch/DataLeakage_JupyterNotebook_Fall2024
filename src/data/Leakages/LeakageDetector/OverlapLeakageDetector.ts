import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import OverlapLeakageInstance from '../LeakageInstance/OverlapLeakageInstance';
import OverlapLeakageSource from '../LeakageSource/OverlapLeakageSource';
import { LeakageType, TaintType, type TrainTestSite } from '../types';

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
    const occurrences: Record<
      string,
      { line: number; trainingData: string; testingData: Set<string> }
    > = {};
    const overlapLeakageData: Record<number, Set<TrainTestSite>> = {};

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

        const hash = `${trainingInvocation}_${testingInvocation}`;
        occurrences[hash] = {
          line: this.internalLineMappings[
            this.invocationLineMappings[testingInvocation]
          ],
          trainingData: trainingInvocation,
          testingData: new Set([testingInvocation]),
        };
      });

    for (const occurrence of Object.values(occurrences)) {
      const trainingData = occurrence.trainingData;
      const testingData = Array.from(
        this.invocationTrainTestMappings[trainingData],
      );
      const trainTestSite: TrainTestSite = {
        trainingData: this.invocationMetadataMappings[trainingData],
        testingData: testingData.map(
          (testingInvocation) =>
            this.invocationMetadataMappings[testingInvocation],
        ),
      };

      if (!(occurrence.line in overlapLeakageData)) {
        overlapLeakageData[occurrence.line] = new Set();
      }
      overlapLeakageData[occurrence.line].add(trainTestSite);
    }

    for (const [line, trainTestSites] of Object.entries(overlapLeakageData)) {
      overlapLeakageInstances.push(
        new OverlapLeakageInstance(
          parseInt(line),
          Array.from(trainTestSites),
          new OverlapLeakageSource(
            this.taints.filter((source) => source.getType() === TaintType.Dup),
          ),
        ),
      );
    }

    return overlapLeakageInstances;
  }
}
