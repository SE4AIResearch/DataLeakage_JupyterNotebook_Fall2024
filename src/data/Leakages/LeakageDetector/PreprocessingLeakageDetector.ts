import { ExtensionContext } from 'vscode';
import { TextDecoder } from 'util';
import LeakageDetector from './LeakageDetector';
import PreprocessingLeakageInstance from '../LeakageInstance/PreprocessingLeakageInstance';
import PreprocessingLeakageSource from '../LeakageSource/PreprocessingLeakageSource';
import { LeakageType, TaintType, type Metadata } from '../types';

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
    const preprocessingLeakageData: Record<
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
          trainingInvocation,
          trainingFunction,
          trainingContext,
          testingModel,
          testingVariable,
          testingInvocation,
          testingFunction,
          testingContext,
          destinationVariable,
          sourceVariable,
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

        preprocessingLeakageData[hash] = {
          training: this.invocationMetadataMappings[trainingInvocation],
          testing: this.invocationMetadataMappings[testingInvocation],
        };
      });

    for (const data of Object.values(preprocessingLeakageData)) {
      preprocessingLeakageInstances.push(
        new PreprocessingLeakageInstance(
          data.training,
          data.testing,
          new PreprocessingLeakageSource(
            this.taints.filter(
              (source) => source.getType() === TaintType.Rowset,
            ),
          ),
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
