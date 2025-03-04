import * as vscode from 'vscode';
import Docker, { ContainerCreateOptions, ImageInfo } from 'dockerode';

import { DockerTemp, TempDir } from '../../helpers/TempDir';

async function downloadImage(docker: Docker) {
  try {
    const images: ImageInfo[] = await docker.listImages();

    const getImage = async () =>
      images.find((image) => image.RepoTags?.includes(DockerTemp.IMAGE_NAME));

    if (!(await getImage())) {
      const imageRes = await new Promise((resolve, reject) => {
        docker.pull(
          DockerTemp.IMAGE_NAME,
          (pullError: any, pullStream: any) => {
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
          },
        );
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function getExistingContainer(docker: Docker, containerName: string) {
  try {
    const containers = await docker.listContainers({ all: true });

    const targetContainer = containers.find((container) => {
      return container.Names.some(
        (name) => name === `/${containerName}` || name === containerName,
      );
    });
    if (!targetContainer) {
      console.log(`Container '${containerName}' not found`);
      return null;
    }

    const container = docker.getContainer(targetContainer.Id);

    if (targetContainer.State === 'running') {
      console.log(
        `Container '${containerName}' is running, forcing it to stop`,
      );

      await container.stop({ t: 0 }); // t: 0 means no grace period, force kill
      console.log(`Container '${containerName}' has been stopped`);
    } else {
      console.log(`Container '${containerName}' exists but is not running`);
    }

    return container;
  } catch (error) {
    console.error('Error handling container:', error);
    throw error;
  }
}

async function createContainer(docker: Docker, tempDir: TempDir) {
  try {
    const config: ContainerCreateOptions = {
      name: 'DataLeakageAlgo',
      Image: DockerTemp.IMAGE_NAME,
      Cmd: [`${DockerTemp.PYTHON_FILE_PATH}`, `-o`],
      HostConfig: {
        Binds: [`${tempDir.getAlgoDirPath()}:${DockerTemp.CONTAINER_DIR_PATH}`],
      },
      platform: 'linux/amd64',
    };

    const container =
      (await getExistingContainer(docker, config.name!)) ??
      (await docker.createContainer(config));

    const exec = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });

    exec.pipe(process.stdout);

    return container;
  } catch (error) {
    console.error('Error creating container:', error);
    throw error;
  }
}

export async function runDocker(tempDir: TempDir) {
  const docker = new Docker();
  await downloadImage(docker);
  const container = await createContainer(docker, tempDir);

  const timeout = new Promise((res) =>
    setTimeout(() => res('Timed out'), 1000 * 60 * 60),
  );

  const result = await Promise.race([container.start(), timeout]);
}
