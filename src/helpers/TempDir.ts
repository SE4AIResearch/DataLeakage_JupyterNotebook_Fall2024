import os from 'os';
import path from 'path';
import fs from 'fs';

import { xxHash32 } from 'js-xxhash';

const PYTHON_FILE_NAME = 'input.py';
const tempDir = os.tmpdir();

export class TempDir {
  private _id: string;
  private _algoInputFilePath: string;
  private _algoDirPath: string;

  constructor(str: string) {
    // FIXME: Refactor duplicate code / boilerplate
    this._id = this.computeHash(str);
    this._algoInputFilePath = path.join(tempDir, this._id, PYTHON_FILE_NAME);
    this._algoDirPath = path.join(tempDir, this._id);

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
