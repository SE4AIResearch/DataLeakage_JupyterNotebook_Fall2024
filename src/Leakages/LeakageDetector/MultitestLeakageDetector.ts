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
    const leakageInstances: MultitestLeakageInstance[] = [];
    const uniqueInstances: Record<string, Set<string>> = {};
    const invocationMappings: Record<
      string,
      Record<string, { training?: Metadata; testing?: Metadata }>[]
    > = {};

    const leakagesFile = await this.readFile('Telemetry_MultiUseTestLeak.csv');
    leakagesFile
      .filter((line) => !!line)
      .forEach((line) => {
        const [
          modelA,
          variableA,
          invocationStringA,
          functionA,
          contextA,
          modelB,
          variableB,
          invocationStringB,
          functionB,
          contextB,
        ] = line.split('\t');

        if (!(invocationStringA in invocationMappings)) {
          const line =
            this.internalLineMappings[
              this.invocationLineMappings[invocationStringA]
            ];
          const occurrenceHash = this.uniqueOccurrenceHash(
            modelA,
            variableA,
            functionA,
            line,
          );
          invocationMappings[invocationStringA] = [
            ...(invocationMappings[invocationStringA] ?? []),
            {
              [occurrenceHash]: {
                testing: {
                  model: modelA,
                  variable: variableA,
                  function: functionA,
                  line: line,
                },
              },
            },
          ];
        }
        if (!(invocationStringB in invocationMappings)) {
          const line =
            this.internalLineMappings[
              this.invocationLineMappings[invocationStringB]
            ];
          const occurrenceHash = this.uniqueOccurrenceHash(
            modelB,
            variableB,
            functionB,
            line,
          );
          invocationMappings[invocationStringB] = [
            ...(invocationMappings[invocationStringB] ?? []),
            {
              [occurrenceHash]: {
                testing: {
                  model: modelB,
                  variable: variableB,
                  function: functionB,
                  line: this.internalLineMappings[
                    this.invocationLineMappings[invocationStringB]
                  ],
                },
              },
            },
          ];
        }

        const hash = this.uniqueTestingVariableHash(
          invocationStringA,
          invocationStringB,
        );
        if (!(hash in uniqueInstances)) {
          uniqueInstances[hash] = new Set();
        }
        uniqueInstances[hash].add(invocationStringA);
        uniqueInstances[hash].add(invocationStringB);
      });

    const pairsFile = await this.readFile('Telemetry_ModelPair.csv');
    pairsFile
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

        if (testingInvocationString in invocationMappings) {
          const line =
            this.internalLineMappings[
              this.invocationLineMappings[testingInvocationString]
            ];
          const occurrenceHash = this.uniqueOccurrenceHash(
            testingModel,
            testingVariable,
            testingFunction,
            line,
          );
          const occurrences = invocationMappings[testingInvocationString];
          for (const occurrence of occurrences) {
            if (occurrenceHash in occurrence) {
              occurrence[occurrenceHash].training = {
                model: trainingModel,
                variable: trainingVariable,
                function: trainingFunction,
                line: this.internalLineMappings[
                  this.invocationLineMappings[trainingInvocationString]
                ],
              };
              break;
            }
          }
        }
      });

    for (const [_, invocationStrings] of Object.entries(uniqueInstances)) {
      leakageInstances.push(
        new MultitestLeakageInstance(
          Array.from(invocationStrings)
            .reduce(
              (e, invocationString) => [
                ...e,
                ...invocationMappings[invocationString]
                  .reduce((x, y) => [...x, ...Object.values(y)], [{}])
                  .filter((x) => Object.entries(x).length > 0),
              ],
              [{}],
            )
            .filter((e) => Object.entries(e).length > 0),
        ),
      );
    }

    return leakageInstances;
  }

  private uniqueTestingVariableHash(
    invocationStringA: string,
    invocationStringB: string,
  ): string {
    return [invocationStringA, invocationStringB].sort().join('_');
  }

  private uniqueOccurrenceHash(
    model: string,
    variable: string,
    func: string,
    line: number,
  ) {
    return `${model}_${variable}_${func}_${line}`;
  }
}
