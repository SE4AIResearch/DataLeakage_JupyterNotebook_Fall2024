import * as vscode from 'vscode';
import Docker, { ContainerCreateOptions, ImageInfo } from 'dockerode';
import { ButtonViewProvider } from '../../view/ButtonView/ButtonViewProvider';
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
      Entrypoint: ['bash', '-c'],
      Cmd: [
        `python3 -m src.main ${DockerTemp.PYTHON_FILE_PATH} -o && sleep 1s`,
      ],
      HostConfig: {
        Binds: [`${tempDir.getAlgoDirPath()}:${DockerTemp.CONTAINER_DIR_PATH}`],
      },
      platform: 'linux/amd64',
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      OpenStdin: false,
      StdinOnce: false,
    };

    console.log(`Docker Bind Path: ${config.HostConfig?.Binds}`);

    const existingContainer = await getExistingContainer(docker, config.name!);

    if (existingContainer) {
      try {
        await existingContainer.remove();
      } catch (err) {
        console.error('Failed to remove existing container...');
      }
    }

    const container = await docker.createContainer(config);

    return container;
  } catch (error) {
    console.error('Error creating container:', error);
    throw error;
  }
}

export async function runDocker(tempDir: TempDir) {
  try {
    const docker = new Docker();
    await downloadImage(docker);
    const container = await createContainer(docker, tempDir);

    // Get debug output channel
    const outputChannel = ButtonViewProvider.getOutputDebugChannel();
    // Clear existing output
    ButtonViewProvider.clearOutputDebugChannel();

    // Start the container first
    await container.start();
    console.log('Container started successfully');
    outputChannel.appendLine('Container started successfully');

    // Set up a stream to capture output after container is started
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });

    // Initialize variables to store container output
    let stdoutData = '';
    let stderrData = '';

    // Handle the container output stream
    return new Promise<any>((resolve, reject) => {
      // Process container output
      stream.on('data', (chunk) => {
        const output = chunk.toString();
        stdoutData += output;
        // Show output in debug channel
        outputChannel.appendLine(output);
        // Also log to console
        console.log(output);
      });

      stream.on('error', (error) => {
        stderrData += error.toString();
        outputChannel.appendLine(`ERROR: ${error.toString()}`);
        console.error(`Stream error: ${error}`);
      });

      // Set up a timeout
      const timeoutDuration = 1000 * 60 * 60;
      const timeout = setTimeout(() => {
        outputChannel.appendLine('Container execution timed out');
        container.stop({ t: 10 }).then(() => {
          resolve({ StatusCode: -1, reason: 'timeout' });
        });
      }, timeoutDuration);

      // Wait for container to finish
      container.wait((err, result) => {
        clearTimeout(timeout);

        if (err) {
          outputChannel.appendLine(`Container error: ${err.message}`);
          console.error(`Container error: ${err}`);
          reject(err);
          return;
        }

        outputChannel.appendLine(
          `Container exited with status code: ${result.StatusCode}`,
        );
        console.log(`Container exited with status code: ${result.StatusCode}`);

        // Check for common Python errors in the output
        const hasSyntaxError =
          stdoutData.includes('SyntaxError') ||
          stderrData.includes('SyntaxError');
        const hasIndentationError =
          stdoutData.includes('IndentationError') ||
          stderrData.includes('IndentationError');
        const hasParseError =
          stdoutData.includes('Failed to parse') ||
          stderrData.includes('Failed to parse');

        if (hasSyntaxError || hasIndentationError || hasParseError) {
          // Show the Quick Fix dialog if Python syntax error is detected
          outputChannel.show();

          // Log specific error type for debugging
          if (hasSyntaxError) {
            outputChannel.appendLine('Python syntax error detected.');
          }
          if (hasIndentationError) {
            outputChannel.appendLine('Python indentation error detected.');
          }
          if (hasParseError) {
            outputChannel.appendLine('Failed to parse notebook.');
          }

          // Add a structured error response
          resolve({
            StatusCode: result.StatusCode,
            error: true,
            errorType: hasSyntaxError
              ? 'SyntaxError'
              : hasIndentationError
                ? 'IndentationError'
                : 'ParseError',
            stdout: stdoutData,
            stderr: stderrData,
          });
        } else {
          resolve(result);
        }
      });
    });
  } catch (error) {
    // Get debug output channel for error reporting
    const outputChannel = ButtonViewProvider.getOutputDebugChannel();
    outputChannel.appendLine(`Error running Docker container: ${error}`);
    outputChannel.show();

    console.error('Error running Docker container:', error);
    throw error;
  }
}
