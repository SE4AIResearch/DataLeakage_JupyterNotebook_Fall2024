import os from 'os';
import path from 'path';
import fs from 'fs';

import * as vscode from 'vscode';

import { xxHash32 } from 'js-xxhash';
import { ConversionToPython } from './conversion/LineConversion';

const PYTHON_FILE_NAME = 'input.py';
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
    this._id = this.computeHash(str);
    this._algoInputFilePath = path.join(tempDir, this._id, PYTHON_FILE_NAME);
    this._algoJupyLineMappingPath = path.join(
      tempDir,
      this._id,
      JUPYTER_LINE_MAPPING_FILE_NAME,
    );
    this._algoDirPath = path.join(tempDir, this._id);
    this._algoOutputDirPath = path.join(tempDir, this._id);

    try {
      fs.mkdirSync(this._algoDirPath);
    } catch {
      this._id = this.computeHash(str);
      this._algoInputFilePath = path.join(tempDir, this._id, PYTHON_FILE_NAME);
      this._algoDirPath = path.join(tempDir, this._id);
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
  static IMAGE_NAME = 'owentruong/leakage-analysis:latest';
  static CONTAINER_DIR_PATH = '/input';
  static PYTHON_FILE_PATH = path.posix.join(
    this.CONTAINER_DIR_PATH,
    PYTHON_FILE_NAME,
  );
}
