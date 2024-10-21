import * as vscode from 'vscode';

export type CellInfo = {
  cellStr: string;
  cellIdx: number;
  startLine: number;
};
// FIXME: Need to add data like which lines a cell starts in the python file exclusive of the Cell Line

/**
 * We use CellConversion to convert between Notebook (.ipynb) & Python Files (.py)
 */
export class CellConversion {
  private readonly cellLineRegex = /^#@%&&&@ \d+ ##@%&&#$/gm;

  // Used for converting Notebook -> Python

  private createCellLine(index: number): string {
    return `#@%&&&@ ${index} ##@%&&#`;
  }

  public insertCellIndices(
    cellDataWithIndex: [string, number][],
  ): [CellInfo[], string] {
    const getLengthOfString = (str: string) => str.split(/\r\n|\r|\n/).length;

    const cellInfoArr: CellInfo[] = [];
    let res = '';
    let curLine = 1;

    cellDataWithIndex.forEach(([cellStr, cellIdx]) => {
      cellInfoArr.push({
        cellStr,
        cellIdx,
        startLine: curLine,
      });
      res = res + `${this.createCellLine(cellIdx)}\n${cellStr}\n`;
      curLine = getLengthOfString(res);
    });

    return [cellInfoArr, res];
  }

  // Used for converting Python -> Notebook

  public extractCellIndices(pythonFileData: string): CellInfo[] {
    // NO LONGER NECESSARY TO CREATE THIS METHOD
    return [];
  }
}
