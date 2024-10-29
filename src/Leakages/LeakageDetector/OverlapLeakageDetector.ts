import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import OverlapLeakageInstance from '../LeakageInstance/OverlapLeakageInstance';
import { LeakageType } from '../types';
import OverlapLeakageSource from '../LeakageSource/OverlapLeakageSource';

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

        overlapLeakageInstances.push(
          new OverlapLeakageInstance(
            {
              model: trainingModel,
              variable: trainingVariable,
              function: trainingFunction,
              line: this.internalLineMappings[
                this.invocationLineMappings[trainingInvocationString]
              ],
            },
            {
              model: testingModel,
              variable: testingVariable,
              function: testingFunction,
              line: this.internalLineMappings[
                this.invocationLineMappings[testingInvocationString]
              ],
            },
            new OverlapLeakageSource(this.taints),
          ),
        );
      });

    return overlapLeakageInstances;
  }
}
