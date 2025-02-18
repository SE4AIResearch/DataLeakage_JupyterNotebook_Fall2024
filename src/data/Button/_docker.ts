import * as vscode from 'vscode';
import Docker, { ImageInfo } from 'dockerode';

import { DockerTemp, TempDir } from '../../helpers/TempDir';

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

export async function runDocker(tempDir: TempDir) {
  const docker = new Docker();
  await ensureImageExist(docker, DockerTemp.IMAGE_NAME);

  const timeout = new Promise((res) =>
    setTimeout(() => res('Timed out'), 20000),
  );

  const result = await Promise.race([
    docker.run(
      DockerTemp.IMAGE_NAME,
      [`${DockerTemp.PYTHON_FILE_PATH}`, `-o`],
      process.stdout,
      {
        HostConfig: {
          Binds: [
            `${tempDir.getAlgoDirPath()}:${DockerTemp.CONTAINER_DIR_PATH}`,
          ],
        },
      },
    ),
    timeout,
  ]);
}
