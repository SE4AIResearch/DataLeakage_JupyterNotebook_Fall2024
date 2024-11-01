import * as vscode from 'vscode';

export type JupyCell = {
  data: string;
  index: number;
};

export type JupyCellLine = {
  data: string;
  cellIndex: number;
  lineIndex: number;
};

export class ConversionToPython {
  private jupyCells: JupyCell[];
  private lineMapRecord: Record<string, string>;
  private pythonCode: string;

  constructor(notebookFile: vscode.NotebookDocument) {
    this.jupyCells = this.convertVSCodeNotebookToJupyCells(notebookFile);
    this.lineMapRecord = ConversionToPython.convertJupyCellsToLineMapRecord(
      this.jupyCells,
    );
    this.pythonCode = ConversionToPython.convertJupyCellsToPythonCode(
      this.jupyCells,
    );
  }

  // PRIVATE FUNCTIONS
  private convertVSCodeNotebookToJupyCells(
    notebookFile: vscode.NotebookDocument,
  ): JupyCell[] {
    return notebookFile
      .getCells()
      .map((cell, i): [vscode.NotebookCell, number] => [cell, i])
      .filter(([cell]) => cell.kind === 2)
      .map(([cell, index]) => ({ data: cell.document.getText(), index }));
  }

  // STATIC FUNCTIONS
  public static convertJupyCellsToLineMapRecord(
    jupyCells: JupyCell[],
  ): Record<string, string> {
    const forwardLookup: Record<string, string> = {};

    let pythonLineIdx = 0;
    jupyCells.forEach(({ data, index }) =>
      data.split('\n').forEach((lineContent, lineIdx) => {
        forwardLookup[`${index}:${lineIdx}:${pythonLineIdx++}`] = lineContent;
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

  public getLineMapRecord(): Record<string, string> {
    return this.lineMapRecord;
  }

  public getPythonCode(): string {
    return this.pythonCode;
  }
}

export class ConversionToJupyter {
  private lineMapRecord: Record<string, string>;
  private jupyCells: JupyCell[];

  constructor(lineMapRecord: Record<string, string>) {
    this.lineMapRecord = lineMapRecord;
    this.jupyCells = this.convertLineMapRecordToJupyCells(lineMapRecord);
  }

  // PRIVATE FUNCTION

  private convertLineMapRecordToJupyCells(
    lineMapRecord: Record<string, string>,
  ): JupyCell[] {
    const jupyCells: JupyCell[] = [];

    Object.entries(lineMapRecord).forEach(([key, value]) => {
      const [index] = key.split(':').map(Number);

      if (!jupyCells[index]) {
        jupyCells[index] = { data: '', index };
      }

      jupyCells[index].data += `${value}\n`;
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
      data,
      cellIndex,
      lineIndex,
    };
  }

  public getJupyCells(): JupyCell[] {
    return this.jupyCells;
  }
}
