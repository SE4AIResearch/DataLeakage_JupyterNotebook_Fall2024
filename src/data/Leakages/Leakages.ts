import * as vscode from 'vscode';
import * as cheerio from 'cheerio';
import { TextDecoder } from 'util';
import path from 'path';
import {
  LeakageType,
  Taint,
  type LeakageInstances,
  type LeakageLines,
  type LeakageOutput,
  type LineTag,
  type Metadata,
} from './types';

export default class Leakages {
  private outputDirectory: string;
  private filename: string;
  private fileLines: number;
  private textDecoder: TextDecoder;

  constructor(outputDirectory: string, filename: string, fileLines: number) {
    this.outputDirectory = outputDirectory;
    this.filename = filename;
    this.fileLines = fileLines;
    this.textDecoder = new TextDecoder();
  }

  /**
   * Parses the necessary output files to extract all the leakage info.
   * @returns An object containing all the lines where each leakage occurs as well as the additional tags per line.
   */
  public async getLeakages(): Promise<LeakageOutput> {
    const file = await this.readFile(`${this.filename}.html`);

    const internalLineMappings = await this.getInternalLineMappings();
    const invocationLineMappings = await this.getInvocationLineMappings();
    const lineMetadataMappings = await this.getLineMetadataMappings(
      internalLineMappings,
      invocationLineMappings,
    );

    const $ = cheerio.load(file);

    const leakageInstances: LeakageInstances = {
      OverlapLeakage: {
        count: -1,
        lines: [],
      },
      PreProcessingLeakage: {
        count: -1,
        lines: [],
      },
      MultiTestLeakage: {
        count: -1,
        lines: [],
      },
    };

    // Parses the table at the top of the HTML file to find all the lines where each leakage occurs.
    $('table.sum')
      .find('tr')
      .each((i, row) => {
        if (i === 0) {
          return;
        }

        const leakage = $(row).find('td, th');
        const leakageType = this.getLeakageType(leakage.first().text());
        const count = leakage.first().next().text();
        const lines = $(leakage.last())
          .find('button')
          .contents()
          .toArray()
          .map((e) => parseInt(e.data ?? 'NaN'))
          .filter((e) => !Number.isNaN(e));

        leakageInstances[leakageType] = {
          count: parseInt(count),
          lines: lines,
        };
      });

    const leakageLines: LeakageLines = {};

    // Parses line by line in the HTML file to get all the additional tags per line.
    for (let i = 0; i < this.fileLines; i++) {
      const leakageLine = $(`#${i}`);

      const buttons = leakageLine
        .nextUntil('span')
        .toArray()
        .flatMap((e) => {
          if (e.type === 'tag') {
            return e.name === 'a' ? e.childNodes : e;
          }
        })
        .filter((e) => !!e);

      buttons.forEach((button) => {
        if (button.type === 'tag' && button.name === 'button') {
          const tag: LineTag = {
            name: '',
            isButton: false,
          };

          const text = button.firstChild;
          if (text && text.type === 'text') {
            tag.name = text.data!;
          }

          const attributes = button.attribs;
          const onClickAttr = attributes['onclick'];
          if (onClickAttr.includes('highlight_lines')) {
            if (tag.name === 'highlight train/test sites') {
              tag.isButton = true;
              const regex = /(?:^|\s)highlight_lines\((.*?)\)(?:\s|$)/g;
              const matches = onClickAttr.matchAll(regex).toArray()[0];
              const lines = JSON.parse(matches[1]);
              tag.highlightTrainTestSites = lines;
            } else if (tag.name === 'highlight other usage') {
              tag.isButton = true;
              const regex = /(?:^|\s)highlight_lines\((.*?)\)(?:\s|$)/g;
              const matches = onClickAttr.matchAll(regex).toArray()[0];
              const lines = JSON.parse(matches[1]);
              tag.highlightOtherUses = lines;
            }
          } else if (
            onClickAttr.includes('mark_leak_lines') &&
            tag.name === 'show and go to first leak src'
          ) {
            tag.isButton = true;
            const regex = /(?:^|\s)mark_leak_lines\((.*?)\)(?:\s|$)/g;
            const matches = onClickAttr.matchAll(regex).toArray()[0];
            const lines = JSON.parse(matches[1]);
            tag.markLeakSources = lines;
          }

          if (!(i in leakageLines)) {
            leakageLines[i] = {
              metadata: lineMetadataMappings[i],
              tags: [],
            };
          }

          leakageLines[i].tags.push(tag);
        }
      });
    }

    return {
      leakageInstances: leakageInstances,
      leakageLines: leakageLines,
    };
  }

  /**
   * Reads a file that is located inside the output directory.
   * @param filename The name of the file to be read.
   * @returns An array containing the lines inside the file.
   */
  public async readFile(filename: string): Promise<string> {
    const filepath = path.join(this.outputDirectory, filename);
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(filepath));
    return this.textDecoder.decode(bytes);
  }

  /**
   * Converts a given string to its respective leakage type enum value.
   * @param string The string to be converted to an enum value.
   * @returns A leakage type enum value.
   */
  private getLeakageType(string: string): LeakageType {
    switch (string) {
      case 'Overlap leakage':
        return LeakageType.OverlapLeakage;
      case 'Pre-processing leakage':
        return LeakageType.PreProcessingLeakage;
      case 'No independence test data':
        return LeakageType.MultiTestLeakage;
      default:
        throw new Error('Unknown leakage type.');
    }
  }

  /**
   * @returns All the mappings from internal program line number to external user line number.
   * IMPORTANT: The leakage detector program starts user lines from 1.
   */
  public async getInternalLineMappings(): Promise<Record<number, number>> {
    const internalLineMappings: Record<number, number> = {};

    const file = await this.readFile(
      path.join(`${this.filename}-fact`, 'LinenoMapping.facts'),
    );
    file
      .split('\n')
      .filter((line) => !!line)
      .forEach((line) => {
        const [internal, external] = line.split('\t');
        internalLineMappings[parseInt(internal)] = parseInt(external);
      });

    return internalLineMappings;
  }

  /**
   * @returns All the mappings from internal invocation to internal program line number.
   */
  public async getInvocationLineMappings(): Promise<Record<string, number>> {
    const invocationLineMappings: Record<string, number> = {};

    const file = await this.readFile(
      path.join(`${this.filename}-fact`, 'InvokeLineno.facts'),
    );
    file
      .split('\n')
      .filter((line) => !!line)
      .forEach((line) => {
        const [invocation, internal] = line.split('\t');
        invocationLineMappings[invocation] = parseInt(internal);
      });

    return invocationLineMappings;
  }

  /**
   * @param internalLineMappings All the mappings from internal program line number to external user line number.
   * @param invocationLineMappings All the mappings from internal invocation to internal program line number.
   * @returns All the mappings from external user line number to metadata info.
   */
  public async getLineMetadataMappings(
    internalLineMappings: Record<number, number>,
    invocationLineMappings: Record<string, number>,
  ): Promise<Record<number, Metadata>> {
    const lineMetadataMappings: Record<string, Metadata> = {};

    const file = await this.readFile(
      path.join(`${this.filename}-fact`, 'Telemetry_ModelPair.csv'),
    );
    file
      .split('\n')
      .filter((line) => !!line)
      .forEach((line) => {
        const [
          testingModel,
          testingVariable,
          testingInvocation,
          testingMethod,
          testingContext,
          trainingModel,
          trainingVariable,
          trainingInvocation,
          trainingMethod,
          trainingContext,
        ] = line.split('\t');

        lineMetadataMappings[
          internalLineMappings[invocationLineMappings[trainingInvocation]]
        ] = {
          isTest: false,
          model: trainingModel,
          variable: trainingVariable,
          method: trainingMethod,
        };
        lineMetadataMappings[
          internalLineMappings[invocationLineMappings[testingInvocation]]
        ] = {
          isTest: true,
          model: testingModel,
          variable: testingVariable,
          method: testingMethod,
        };
      });

    return lineMetadataMappings;
  }

  /**
   * @param internalLineMappings All the mappings from internal program line number to external user line number.
   * @param invocationLineMappings All the mappings from internal invocation to internal program line number.
   * @returns All the mappings from training line (external user line number) to testing lines (external user line number).
   */
  public async getTrainTestMappings(
    internalLineMappings: Record<number, number>,
    invocationLineMappings: Record<string, number>,
  ): Promise<Record<number, Set<number>>> {
    const trainTestMappings: Record<number, Set<number>> = {};

    const file = await this.readFile(
      path.join(`${this.filename}-fact`, 'Telemetry_ModelPair.csv'),
    );
    file
      .split('\n')
      .filter((line) => !!line)
      .forEach((line) => {
        const [
          trainingModel,
          trainingVariable,
          trainingInvocation,
          trainingMethod,
          trainingContext,
          testingModel,
          testingVariable,
          testingInvocation,
          testingMethod,
          testingContext,
        ] = line.split('\t');

        const trainingLine =
          internalLineMappings[invocationLineMappings[trainingInvocation]];
        if (!(line in trainTestMappings)) {
          trainTestMappings[trainingLine] = new Set([
            internalLineMappings[invocationLineMappings[testingInvocation]],
          ]);
        } else {
          trainTestMappings[trainingLine].add(
            internalLineMappings[invocationLineMappings[testingInvocation]],
          );
        }
      });

    return trainTestMappings;
  }

  /**
   * @param internalLineMappings All the mappings from internal program line number to external user line number.
   * @param invocationLineMappings All the mappings from internal invocation to internal program line number.
   * @returns All the mappings from taint (external user line number) to their info.
   */
  public async getTaintMappings(
    internalLineMappings: Record<number, number>,
    invocationLineMappings: Record<string, number>,
  ) {
    const taintMappings: Record<number, Taint> = {};

    const file = await this.readFile(
      path.join(`${this.filename}-fact`, 'TaintStartsTarget.csv'),
    );
    file
      .split('\n')
      .filter((line) => !!line)
      .forEach((line) => {
        const [
          destVariable,
          destContext,
          sourceVariable,
          sourceContext,
          invocation,
          method,
          label,
        ] = line.split('\t');

        const taintLine =
          internalLineMappings[invocationLineMappings[invocation]];
        taintMappings[taintLine] = {
          sourceVariable,
          destVariable,
          method,
          label,
        };
      });

    return taintMappings;
  }

  /**
   * @returns Variable equivalence mappings.
   */
  public async getVariableEquivalenceMappings(): Promise<
    Record<string, Set<string>>
  > {
    const variableEquivalenceMappings: Record<string, Set<string>> = {};

    const file = await this.readFile(
      path.join(`${this.filename}-fact`, 'VarEquals.csv'),
    );
    file
      .split('\n')
      .filter((line) => !!line)
      .forEach((line) => {
        const [lhs, rhs] = line.split('\t');

        if (!(lhs in variableEquivalenceMappings)) {
          variableEquivalenceMappings[lhs] = new Set([rhs]);
        } else {
          variableEquivalenceMappings[lhs].add(rhs);
        }
      });

    return variableEquivalenceMappings;
  }

  /**
   * @returns Data flow mappings.
   */
  public async getDataFlowMappings(
    varEquivMappings: Record<string, Set<string>>,
  ): Promise<Record<string, Set<string>>> {
    const dataFlowMappings: Record<string, Set<string>> = {};

    const file = await this.readFile(
      path.join(`${this.filename}-fact`, 'FlowFromExtended.csv'),
    );
    file
      .split('\n')
      .filter((line) => !!line)
      .forEach((line) => {
        const [dest, destCtxt, source, sourceCtxt, tag] = line.split('\t');

        if (!(source in dataFlowMappings)) {
          dataFlowMappings[source] = new Set([dest]);
        } else {
          // Only adds to the set if it is a new variable, not an equivalent one.
          const existing = dataFlowMappings[source];
          const toBeAdded = varEquivMappings[dest];
          if (existing.intersection(toBeAdded).size === 0) {
            dataFlowMappings[source].add(dest);
          }
        }
      });

    return dataFlowMappings;
  }
}
