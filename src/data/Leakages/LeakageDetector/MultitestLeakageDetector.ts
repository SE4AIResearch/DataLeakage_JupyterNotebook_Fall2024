import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import MultitestLeakageInstance from '../LeakageInstance/MultitestLeakageInstance';
import { LeakageType, type Metadata } from '../types';

export default class MultitestLeakageDetector extends LeakageDetector<MultitestLeakageInstance> {
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

  async getLeakageInstances(): Promise<MultitestLeakageInstance[]> {
    const multitestLeakageInstances: MultitestLeakageInstance[] = [];
    const relatedInvocationSets: Set<string>[] = [];
    const multitestLeakageData: {
      trainingData: Metadata;
      testingData: Metadata[];
    }[][] = [];

    const leakagesFile = await this.readFile('Telemetry_MultiUseTestLeak.csv');
    leakagesFile
      .filter((line) => !!line)
      .forEach((line) => {
        const [
          modelA,
          variableA,
          invocationA,
          functionA,
          contextA,
          modelB,
          variableB,
          invocationB,
          functionB,
          contextB,
        ] = line.split('\t');

        if (!(invocationA in this.invocationMetadataMappings)) {
          this.invocationMetadataMappings[invocationA] = {
            model: modelA,
            variable: variableA,
            function: functionA,
            line: this.internalLineMappings[
              this.invocationLineMappings[invocationA]
            ],
          };
        }
        if (!(invocationB in this.invocationMetadataMappings)) {
          this.invocationMetadataMappings[invocationB] = {
            model: modelB,
            variable: variableB,
            function: functionB,
            line: this.internalLineMappings[
              this.invocationLineMappings[invocationB]
            ],
          };
        }

        for (const set of relatedInvocationSets) {
          if (set.has(invocationA) || set.has(invocationB)) {
            set.add(invocationA);
            set.add(invocationB);
          }
          return;
        }

        relatedInvocationSets.push(new Set([invocationA, invocationB]));
      });

    for (const relatedInvocationSet of relatedInvocationSets) {
      const data: {
        trainingInvocation: string;
        testingInvocations: Set<string>;
      }[] = [];

      for (const [trainingInvocation, testingInvocations] of Object.entries(
        this.invocationTrainTestMappings,
      )) {
        if (testingInvocations.intersection(relatedInvocationSet).size > 0) {
          data.push({
            trainingInvocation: trainingInvocation,
            testingInvocations: testingInvocations,
          });
        }
      }

      multitestLeakageData.push(
        data.map((e) => {
          return {
            trainingData: this.invocationMetadataMappings[e.trainingInvocation],
            testingData: Array.from(e.testingInvocations).map(
              (testingInvocation) =>
                this.invocationMetadataMappings[testingInvocation],
            ),
          };
        }),
      );
    }

    for (const data of multitestLeakageData) {
      multitestLeakageInstances.push(new MultitestLeakageInstance(data));
    }

    return multitestLeakageInstances;
  }
}
