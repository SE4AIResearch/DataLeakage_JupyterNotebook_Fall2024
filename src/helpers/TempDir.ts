import os from 'os';
import path from 'path';
import fs from 'fs';

import { v4 as uuidv4 } from 'uuid';

const PYTHON_FILE_NAME = 'input.py';
const tempDir = os.tmpdir();

export class TempDir {
  private _id: string;
  private _algoInputFilePath: string;
  private _algoDirPath: string;

  constructor() {
    // FIXME: Refactor duplicate code / boilerplate
    this._id = uuidv4();
    this._algoInputFilePath = path.join(tempDir, this._id, PYTHON_FILE_NAME);
    this._algoDirPath = path.join(tempDir, this._id);

    try {
      fs.mkdirSync(this._algoDirPath);
    } catch {
      this._id = uuidv4();
      this._algoInputFilePath = path.join(tempDir, this._id, PYTHON_FILE_NAME);
      this._algoDirPath = path.join(tempDir, this._id);
    }
  }

  public getAlgoInputFilePath() {
    return this._algoInputFilePath;
  }
  public getAlgoDirPath() {
    return this._algoDirPath;
  }
}

// FIXME: Temporary location until we replace docker

export class DockerTemp {
  static IMAGE_NAME = 'owentruong/leakage-analysis:latest';
  static CONTAINER_DIR_PATH = '/input';
  static PYTHON_FILE_PATH = path.join(
    this.CONTAINER_DIR_PATH,
    PYTHON_FILE_NAME,
  );
}
