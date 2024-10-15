import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import MultitestLeakageInstance from '../LeakageInstance/MultitestLeakageInstance';
import { Leakage, MultitestLeakageOccurrenceInfo } from '../types';

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
      Leakage.OverlapLeakage,
    );
  }

  async getLeakageInstances(): Promise<MultitestLeakageInstance[]> {
    const multitestLeakageInstances: MultitestLeakageInstance[] = [];

    const file = await this.readFile('Telemetry_MultiUseTestLeak.csv');
    const testingVariables: Record<string, Set<string>> = {};
    const invocationMappings: Record<string, MultitestLeakageOccurrenceInfo> =
      {};
    file.forEach((line) => {
      const [
        modelA,
        variable,
        invocationStringA,
        functionA,
        contextA,
        modelB,
        variableAgain,
        invocationStringB,
        functionB,
        contextB,
      ] = line.split('\t');

      if (variable !== variableAgain) {
        throw new Error('Testing variables do not match.');
      }

      if (!(invocationStringA in invocationMappings)) {
        invocationMappings[invocationStringA] = {
          model: modelA,
          testingFunction: functionA,
          line: this.internalLineMappings[
            this.invocationLineMappings[invocationStringA]
          ],
        };
      }
      if (!(invocationStringB in invocationMappings)) {
        invocationMappings[invocationStringB] = {
          model: modelB,
          testingFunction: functionB,
          line: this.internalLineMappings[
            this.invocationLineMappings[invocationStringB]
          ],
        };
      }

      if (!(variable in testingVariables)) {
        testingVariables[variable] = new Set();
      }
      testingVariables[variable].add(invocationStringA);
      testingVariables[variable].add(invocationStringB);
    });

    for (const [
      testingVariable,
      correspondingInvocationStrings,
    ] of Object.entries(testingVariables)) {
      multitestLeakageInstances.push(
        new MultitestLeakageInstance(
          testingVariable,
          Array.from(correspondingInvocationStrings).map(
            (invocationString) => invocationMappings[invocationString],
          ),
        ),
      );
    }

    return multitestLeakageInstances;
  }
}
