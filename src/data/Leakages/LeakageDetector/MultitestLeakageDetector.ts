import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import MultitestLeakageInstance from '../LeakageInstance/MultitestLeakageInstance';
import { LeakageType, TrainTestSite } from '../types';

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

    // Lists all the testing variables that are used multiple times
    const noIndependentTestingInvocations: Set<string> = new Set();
    const noIndependentTestsFile = await this.readFile(
      'ValOrTestDataWithModel.csv',
    );
    noIndependentTestsFile
      .filter((line) => !!line)
      .forEach((line) => {
        const [model, variable, invocation, func, context] = line.split('\t');

        if (!(invocation in this.invocationMetadataMappings)) {
          this.invocationMetadataMappings[invocation] = {
            model: model,
            variable: variable,
            func: func,
            line: this.internalLineMappings[
              this.invocationLineMappings[invocation]
            ],
          };
        }

        noIndependentTestingInvocations.add(invocation);
      });

    // Lists all the links between two testing variables
    const relatedInvocationSets: Set<string>[] = [];
    const otherUsageLines: Record<string, Set<string>> = {};
    const otherUsagesFile = await this.readFile(
      'Telemetry_MultiUseTestLeak.csv',
    );
    otherUsagesFile
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

        if (!(invocationA in otherUsageLines)) {
          otherUsageLines[invocationA] = new Set();
        }
        otherUsageLines[invocationA].add(invocationB);
        if (!(invocationB in otherUsageLines)) {
          otherUsageLines[invocationB] = new Set();
        }
        otherUsageLines[invocationB].add(invocationA);

        for (const set of relatedInvocationSets) {
          if (set.has(invocationA) || set.has(invocationB)) {
            set.add(invocationA);
            set.add(invocationB);
            return;
          }
        }
        relatedInvocationSets.push(new Set([invocationA, invocationB]));
      });

    // Gets all the multitest leakage occurrences
    const allOccurrences: Record<string, Set<string>> = {};
    for (const [trainingInvocation, testingInvocations] of Object.entries(
      this.invocationTrainTestMappings,
    )) {
      if (
        testingInvocations.intersection(noIndependentTestingInvocations).size >
        0
      ) {
        allOccurrences[trainingInvocation] = testingInvocations;
      }
    }

    // Groups the multitest leakage occurrences based on the relationships between their testing invocations
    const multitestLeakagesData: Record<string, Set<string>>[][] = [];
    for (const [trainingInvocation, testingInvocations] of Object.entries(
      allOccurrences,
    )) {
      let disjoint = true;
      for (const multitestOccurrences of multitestLeakagesData) {
        let allInvocations: Set<string> = new Set();
        for (const multitestOccurrence of multitestOccurrences) {
          Object.values(multitestOccurrence).forEach(
            (testingInvocations) =>
              (allInvocations = allInvocations.union(testingInvocations)),
          );
        }

        for (const relatedInvocationSet of relatedInvocationSets) {
          if (
            allInvocations.intersection(relatedInvocationSet).size > 0 &&
            testingInvocations.intersection(relatedInvocationSet).size > 0
          ) {
            disjoint = false;
            multitestOccurrences.push({
              [trainingInvocation]: testingInvocations,
            });
            break;
          }
        }
      }

      if (disjoint) {
        multitestLeakagesData.push([
          {
            [trainingInvocation]: testingInvocations,
          },
        ]);
      }
    }

    for (const multitestLeakageData of multitestLeakagesData) {
      const lines: number[] = [];
      for (const occurrence of multitestLeakageData) {
        const sets = Object.values(occurrence);
        sets.forEach((set) =>
          lines.push(
            ...Array.from(set).map(
              (e) => this.internalLineMappings[this.invocationLineMappings[e]],
            ),
          ),
        );
      }

      const occurrences: {
        trainTest: TrainTestSite;
        otherUsageLines: number[];
      }[] = [];
      for (const occurrence of multitestLeakageData) {
        for (const [trainingInvocation, testingInvocations] of Object.entries(
          occurrence,
        )) {
          const otherLines: Set<number> = new Set();
          const keys = new Set(Object.keys(otherUsageLines)).intersection(
            testingInvocations,
          );
          keys.forEach((key) => {
            otherUsageLines[key].forEach((invocation) => {
              otherLines.add(
                this.internalLineMappings[
                  this.invocationLineMappings[invocation]
                ],
              );
            });
          });
          occurrences.push({
            otherUsageLines: Array.from(otherLines),
            trainTest: {
              trainingData: this.invocationMetadataMappings[trainingInvocation],
              testingData: Array.from(testingInvocations).map(
                (invocation) => this.invocationMetadataMappings[invocation],
              ),
            },
          });
        }
      }

      multitestLeakageInstances.push(
        new MultitestLeakageInstance(lines, occurrences),
      );
    }

    return multitestLeakageInstances;
  }
}
