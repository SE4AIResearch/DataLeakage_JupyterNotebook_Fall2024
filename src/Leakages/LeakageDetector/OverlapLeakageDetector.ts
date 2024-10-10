import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import Invocation from '../LeakageInstance/Invocation';
import OverlapLeakageInstance from '../LeakageInstance/OverlapLeakageInstance';
import { LeakageType } from '../types';

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
    const overlapLeakagesData: Record<
      string,
      {
        trainingModel: string;
        trainingVariable: string;
        trainingInvocationString: string;
        trainingFunction: string;
        trainingContext: string;
        trainingCountString: string;
        testingModel: string;
        testingVariable: string;
        testingInvocationString: string;
        testingFunction: string;
        testingContext: string;
      }
    > = {};

    // Reads 'FinalOverlapLeak.csv' for basic data about overlap leakages.
    const data = await this.readFile('FinalOverlapLeak.csv');
    for (const line of data) {
      const [
        trainingModel,
        trainingVariable,
        trainingInvocationString,
        trainingFunction,
        trainingContext,
        trainingCountString,
      ] = line.split('\t');

      const hash = this.overlapLeakageHashFunction(
        trainingModel,
        trainingVariable,
        trainingInvocationString,
        trainingFunction,
      );

      overlapLeakagesData[hash] = {
        trainingModel: trainingModel,
        trainingVariable: trainingVariable,
        trainingInvocationString: trainingInvocationString,
        trainingFunction: trainingFunction,
        trainingContext: trainingContext,
        trainingCountString: trainingCountString,
        testingModel: '',
        testingVariable: '',
        testingInvocationString: '',
        testingFunction: '',
        testingContext: '',
      };
    }

    // Reads 'Telemetry_OverlapLeak.csv' for addition data about the existing leaks.
    const additionalData = await this.readFile('Telemetry_OverlapLeak.csv');
    for (const line of additionalData) {
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

      const hash = this.overlapLeakageHashFunction(
        trainingModel,
        trainingVariable,
        trainingInvocationString,
        trainingFunction,
      );

      if (hash in overlapLeakagesData) {
        overlapLeakagesData[hash] = {
          ...overlapLeakagesData[hash],
          testingModel: testingModel,
          testingVariable: testingVariable,
          testingInvocationString: testingInvocationString,
          testingFunction: testingFunction,
          testingContext: testingContext,
        };
      }
    }

    const overlapLeakageInstances: OverlapLeakageInstance[] = [];

    for (const overlapLeakageData of Object.values(overlapLeakagesData)) {
      const trainingInvocationString =
        overlapLeakageData.trainingInvocationString;
      const trainingInternalLineNumber =
        this.invocationLineMappings[trainingInvocationString];
      const trainingInvocation = new Invocation(
        trainingInvocationString,
        trainingInternalLineNumber,
        this.internalLineMappings[trainingInternalLineNumber],
        this.invocationFunctionMappings[trainingInvocationString],
      );

      const testingInvocationString =
        overlapLeakageData.testingInvocationString;
      const testingInternalLineNumber =
        this.invocationLineMappings[testingInvocationString];
      const testingInvocation = new Invocation(
        testingInvocationString,
        testingInternalLineNumber,
        this.internalLineMappings[testingInternalLineNumber],
        this.invocationFunctionMappings[testingInvocationString],
      );

      overlapLeakageInstances.push(
        new OverlapLeakageInstance(
          trainingInvocation,
          overlapLeakageData.trainingVariable,
          testingInvocation,
          overlapLeakageData.testingVariable,
        ),
      );
    }

    return overlapLeakageInstances;
  }

  private overlapLeakageHashFunction(...args: string[]): string {
    return args.reduce((string, e) => (string += e), '');
  }
}
