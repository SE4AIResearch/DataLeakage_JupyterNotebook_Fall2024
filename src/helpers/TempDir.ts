import os from 'os';
import path from 'path';
import fs from 'fs';

import * as vscode from 'vscode';

import { xxHash32 } from 'js-xxhash';
import { ConversionToPython } from './conversion/LineConversion';

export type OutputFileNames = 'varEquals' | 'invokePath';

export const outputFiles: Record<OutputFileNames, string> = {
  varEquals: 'VarEquals.csv',
  invokePath: 'InvokePath.csv',
};

const BASE_NAME = 'input';
const PYTHON_FILE_NAME = `${BASE_NAME}.py`;
const OUTPUT_FACT_DIR_NAME = `${BASE_NAME}-fact`;
const JUPYTER_LINE_MAPPING_FILE_NAME = 'jupyter_line_mapping.json';
const tempDir = os.tmpdir();

export class TempDir {
  private _id: string;
  private _algoInputFilePath: string;
  private _algoJupyLineMappingPath: string;
  private _algoDirPath: string;
  private _algoOutputDirPath: string;

  constructor(str: string) {
    // FIXME: Refactor duplicate code / boilerplate

    // Unique hash value for the specific jupyter notebook / python file
    this._id = this.computeHash(str);
    const parentDirectory = path.join(tempDir, this._id);

    // Input python file path, i.e. absolute path for input.py
    this._algoInputFilePath = path.join(parentDirectory, PYTHON_FILE_NAME);

    // Path to file that contain mapping of Jupyter Notebook to Python file lines
    this._algoJupyLineMappingPath = path.join(
      parentDirectory,
      JUPYTER_LINE_MAPPING_FILE_NAME,
    );

    // Parent directory path of input
    this._algoDirPath = path.join(parentDirectory);

    // Parent directory path of output
    this._algoOutputDirPath = path.join(parentDirectory);

    try {
      fs.mkdirSync(this._algoDirPath);
    } catch {
      this._id = this.computeHash(str);
      this._algoInputFilePath = path.join(parentDirectory, PYTHON_FILE_NAME);
      this._algoDirPath = path.join(parentDirectory);
    }
  }

  private computeHash(input: string): string {
    return String(xxHash32(input, 0));
  }

  public getId() {
    return this._id;
  }

  public getAlgoInputFilePath() {
    return this._algoInputFilePath;
  }
  public getAlgoJupyLineMappingPath() {
    return this._algoJupyLineMappingPath;
  }
  public getAlgoOutputDirPath() {
    return this._algoOutputDirPath;
  }
  public getAlgoDirPath() {
    return this._algoDirPath;
  }
  public getOutputFilePath(name: OutputFileNames) {
    return path.join(
      this._algoOutputDirPath,
      OUTPUT_FACT_DIR_NAME,
      outputFiles[name],
    );
  }

  public static async getTempDir(notebookFilePath: string) {
    const notebookDocument = await vscode.workspace.openNotebookDocument(
      vscode.Uri.file(notebookFilePath),
    );
    const pythonCode = new ConversionToPython(notebookDocument).getPythonCode();
    const tempDir = new TempDir(pythonCode);
    return tempDir;
  }
}

// FIXME: Temporary location until we replace docker

export class DockerTemp {
  static IMAGE_NAME = 'owentruong/leakage-analysis:2.0';
  static CONTAINER_DIR_PATH = '/input';
  static PYTHON_FILE_PATH = path.posix.join(
    this.CONTAINER_DIR_PATH,
    PYTHON_FILE_NAME,
  );
}
