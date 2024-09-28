import * as vscode from 'vscode';

import Docker, { ImageInfo } from 'dockerode';
import { CellConversion } from '../helpers/CellConversion';
import {
  ALGO_CONTAINER_DIR_PATH,
  ALGO_HOST_DIR_PATH,
  IMAGE_NAME,
  getAlgoInputFilePath,
} from '../helpers/utils';

export async function ensureImageExist(docker: Docker, imageName: string) {
  try {
    const images: ImageInfo[] = await docker.listImages();

    const getImage = async () =>
      images.find((image) => image.RepoTags?.includes(`${imageName}:latest`));

    if (!(await getImage())) {
      const imageRes = await new Promise((resolve, reject) => {
        docker.pull(imageName, (pullError: any, pullStream: any) => {
          if (pullError) {
            reject(pullError);
          }
          docker.modem.followProgress(
            pullStream,
            (progressError: any, output: any) => {
              if (progressError) {
                reject(progressError);
              } else {
                resolve(output);
                return;
              }
            },
          );
        });
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export function getNotebookInNormalFormat(
  notebookFile: vscode.NotebookDocument,
): string {
  const cellConversion = new CellConversion();

  const codeCellsWithIndex: [string, number][] = notebookFile
    .getCells()
    .map((cell, i): [vscode.NotebookCell, number] => [cell, i])
    .filter(([cell]) => cell.kind === 2)
    .map(([cell, i]) => [cell.document.getText(), i]);

  return cellConversion.insertCellIndices(codeCellsWithIndex)[1];
}

export async function requestAlgorithm() {
  const docker = new Docker();
  await ensureImageExist(docker, IMAGE_NAME);

  const result = await docker.run(
    IMAGE_NAME,
    [`${getAlgoInputFilePath(ALGO_CONTAINER_DIR_PATH)}`, `-o`],
    process.stdout,
    {
      HostConfig: {
        Binds: [`${ALGO_HOST_DIR_PATH}:${ALGO_CONTAINER_DIR_PATH}`],
      },
    },
  );
}
