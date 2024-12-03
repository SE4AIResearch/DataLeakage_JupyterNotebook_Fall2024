import * as vscode from 'vscode';
import * as cheerio from 'cheerio';
import { TextDecoder } from 'util';
import path from 'path';
import {
  LeakageType,
  type LeakageInstances,
  type LeakageLines,
  type LeakageOutput,
  type LineTag,
  type Metadata,
} from './types';

export default class Leakages {
  private outputDirectory: string;
  private file: string;
  private fileLines: number;
  private textDecoder: TextDecoder;

  constructor(outputDirectory: string, file: string, fileLines: number) {
    this.outputDirectory = outputDirectory;
    this.file = file;
    this.fileLines = fileLines;
    this.textDecoder = new TextDecoder();
  }

  /**
   * Parses the necessary output files to extract all the leakage info.
   * @returns An array of all the leakages.
   */
  public async getLeakages(): Promise<LeakageOutput> {
    const file = await this.readFile(`${this.file}.html`);

    const internalLineMappings = await this.getInternalLineMappings();
    const invocationLineMappings = await this.getInvocationLineMappings();
    const lineMetadataMappings = await this.getLineMetadataMappings(
      internalLineMappings,
      invocationLineMappings,
    );

    const $ = cheerio.load(file);

    const leakageInstances: LeakageInstances = {
      OverlapLeakage: [],
      PreProcessingLeakage: [],
      MultiTestLeakage: [],
    };

    $('table.sum')
      .find('tr')
      .each((i, row) => {
        if (i === 0) {
          return;
        }

        const leakage = $(row).find('td, th');
        const leakageType = this.getLeakageType(leakage.first().text());
        const lines = $(leakage.last())
          .find('button')
          .contents()
          .toArray()
          .map((e) => parseInt(e.data ?? 'NaN'))
          .filter((e) => !Number.isNaN(e));

        leakageInstances[leakageType] = lines;
      });

    const leakageLines: LeakageLines = {};

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
          const onClick = attributes['onclick'];
          if (onClick.includes('highlight_lines')) {
            tag.isButton = true;
            const regex = /(?:^|\s)highlight_lines\((.*?)\)(?:\s|$)/g;
            const matches = onClick.matchAll(regex).toArray()[0];
            const lines = JSON.parse(matches[1]);
            tag.highlightLines = lines;
          } else if (onClick.includes('mark_leak_lines')) {
            tag.isButton = true;
            const regex = /(?:^|\s)mark_leak_lines\((.*?)\)(?:\s|$)/g;
            const matches = onClick.matchAll(regex).toArray()[0];
            const lines = JSON.parse(matches[1]);
            tag.markLeakSources = lines;
          } else {
            tag.isButton = false;
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
  private async readFile(filename: string): Promise<string> {
    const filepath = path.join(this.outputDirectory, filename);
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(filepath));
    return this.textDecoder.decode(bytes);
  }

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

  private async getInternalLineMappings(): Promise<Record<number, number>> {
    const internalLineMappings: Record<number, number> = {};

    const file = await this.readFile(
      path.join(`${this.file}-fact`, 'LinenoMapping.facts'),
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

  private async getInvocationLineMappings(): Promise<Record<string, number>> {
    const invocationLineMappings: Record<string, number> = {};

    const file = await this.readFile(
      path.join(`${this.file}-fact`, 'InvokeLineno.facts'),
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

  public async getLineMetadataMappings(
    internalLineMappings: Record<number, number>,
    invocationLineMappings: Record<string, number>,
  ): Promise<Record<number, Metadata>> {
    const lineMetadataMappings: Record<string, Metadata> = {};

    const file = await this.readFile(
      path.join(`${this.file}-fact`, 'Telemetry_ModelPair.csv'),
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

        lineMetadataMappings[
          internalLineMappings[invocationLineMappings[trainingInvocation]]
        ] = {
          model: trainingModel,
          variable: trainingVariable,
          method: trainingMethod,
        };
        lineMetadataMappings[
          internalLineMappings[invocationLineMappings[testingInvocation]]
        ] = {
          model: testingModel,
          variable: testingVariable,
          method: testingMethod,
        };
      });

    return lineMetadataMappings;
  }
}
