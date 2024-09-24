import path from 'path';
import os from 'os';
import fs from 'fs';

export const CONTAINER_NAME = 'data-leakage--leakage-analysis';
export const IMAGE_NAME = 'owentruong/leakage-analysis:latest';
export const TEMP_DIR = path.join(os.tmpdir(), 'data-leakage-vscode');
export const ALGO_HOST_DIR_PATH = path.join(TEMP_DIR, 'leakage');
export const ALGO_CONTAINER_DIR_PATH = path.join('/', 'leakage');

if (!fs.existsSync(ALGO_HOST_DIR_PATH)) {
  fs.mkdirSync(ALGO_HOST_DIR_PATH, { recursive: true });
}

export const getAlgoInputFilePath = (parentDirPath: string) =>
  path.join(parentDirPath, 'input.py');
