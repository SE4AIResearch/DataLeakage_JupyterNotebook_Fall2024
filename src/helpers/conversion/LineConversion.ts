import * as vscode from 'vscode';
import fs from 'fs';
import util from 'util';
import { isStringRecord } from '../../validation/common';
import {
  isLineMapRecord,
  LineMapRecord,
} from '../../validation/isLineMapRecord';

export type JupyCell = {
  data: string;
  index: number;
  fragment: string;
};

export type JupyCellLine = {
  data: string;
  cellIndex: number;
  lineIndex: number;
  fragment: string;
};

export class ConversionToPython {
  private jupyCells: JupyCell[];
  private lineMapRecord: LineMapRecord;
  private pythonCode: string;

  constructor(notebookFile: vscode.NotebookDocument) {
    this.jupyCells =
      ConversionToPython.convertVSCodeNotebookToJupyCells(notebookFile);
    this.lineMapRecord = ConversionToPython.convertJupyCellsToLineMapRecord(
      this.jupyCells,
    );
    this.pythonCode = ConversionToPython.convertJupyCellsToPythonCode(
      this.jupyCells,
    );
  }

  // PRIVATE FUNCTIONS
  public static convertVSCodeNotebookToJupyCells(
    notebookFile: vscode.NotebookDocument,
  ): JupyCell[] {
    return notebookFile
      .getCells()
      .map((cell, i): [vscode.NotebookCell, number] => [cell, i])
      .filter(([cell]) => cell.kind === 2)
      .map(([cell, index]) => ({
        data: cell.document.getText(),
        index,
        fragment: cell.document.uri.fragment,
      }));
  }

  // STATIC FUNCTIONS
  public static convertJupyCellsToLineMapRecord(
    jupyCells: JupyCell[],
  ): LineMapRecord {
    const forwardLookup: LineMapRecord = {};

    let pythonLineIdx = 0;
    jupyCells.forEach(({ data, index, fragment }) =>
      data.split('\n').forEach((lineContent, lineIdx) => {
        forwardLookup[`${index}:${lineIdx}:${pythonLineIdx++}`] = {
          content: lineContent,
          fragment: fragment,
        };
      }),
    );

    return forwardLookup;
  }
  public static convertJupyCellsToPythonCode(jupyCells: JupyCell[]): string {
    return jupyCells.map(({ data }) => data).join('\n');
  }

  // PUBLIC GET FUNCTIONS

  public getJupyCells(): JupyCell[] {
    return this.jupyCells;
  }

  public getLineMapRecord(): LineMapRecord {
    return this.lineMapRecord;
  }

  public getPythonCode(): string {
    return this.pythonCode;
  }
}

export class ConversionToJupyter {
  private lineMapRecord: LineMapRecord;
  private jupyCells: JupyCell[];

  constructor(lineMapRecord: LineMapRecord) {
    this.lineMapRecord = lineMapRecord;
    this.jupyCells = this.convertLineMapRecordToJupyCells(lineMapRecord);
  }

  // PRIVATE FUNCTION

  private convertLineMapRecordToJupyCells(
    lineMapRecord: LineMapRecord,
  ): JupyCell[] {
    const jupyCells: JupyCell[] = [];

    Object.entries(lineMapRecord).forEach(([key, value]) => {
      const [index] = key.split(':').map(Number);

      if (!jupyCells[index]) {
        jupyCells[index] = { data: '', index, fragment: '' };
      }

      jupyCells[index].data += `${value.content}\n`;
      jupyCells[index].fragment = value.fragment;
    });

    return jupyCells;
  }

  // PUBLIC FUNCTION

  public convertPythonLineToJupyCellLine(
    pythonLineNumber: number,
  ): JupyCellLine {
    const entry = Object.entries(this.lineMapRecord).find(([key, value]) => {
      const [_, __, pythonLineIndex] = key.split(':').map(Number);

      if (pythonLineIndex + 1 === pythonLineNumber) {
        return true;
      }
    });

    if (entry === undefined) {
      throw new RangeError(
        'Python line number not found in Jupyter line mapping.',
      );
    }

    const [key, data] = entry;
    const [cellIndex, lineIndex] = key.split(':').map(Number);

    return {
      data: data.content,
      cellIndex,
      lineIndex,
      fragment: data.fragment,
    };
  }

  public getJupyCells(): JupyCell[] {
    return this.jupyCells;
  }

  // STATIC FUNCTION
  public static async convertJSONFile(
    jsonPath: string,
  ): Promise<ConversionToJupyter> {
    const readFileAsync = util.promisify(fs.readFile);
    const json = JSON.parse(await readFileAsync(jsonPath, 'utf8'));
    if (!isLineMapRecord(json)) {
      throw new TypeError('JSON file is not an object.');
    }
    return new ConversionToJupyter(json);
  }
}
