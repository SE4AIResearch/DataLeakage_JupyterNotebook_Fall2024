# Leakage Detector

<img src="https://gcdnb.pbrd.co/images/xa9zRuVJO0ms.png?o=1" alt="Leakage Detector Poster Logo" width="400"/>

Visual Studio Code extension that detects instances of data leakage in Jupyter Notebooks.

## Features

Data leakage is a common problem in machine learning (ML) code where a model is trained on data that isn't in the training dataset. This skews the model results and causes an overly optimistic estimate of performance. This is why ML developers should separate data into three sets — training, evaluation, and a single-use test set — which many model makers overlook [(Yang et al.)](https://dl.acm.org/doi/10.1145/3551349.3556918). This extension will detect data leakage in Jupyter Notebooks (.ipynb) and suggest ways to fix it.

Leakage comes in three types:
* Preprocessing — the training and test sets are merged into the same set
* Multi-Test — the same test data is used in multiple evaluations
* Overlap — the training and test sets have shared data

The extension creates two tables in the bottom panel. "Leakage Summary" shows how many instances of each type there are. "Leakage Instances" isolates each instance, the line it's on, and the variable that caused it. The user can click on each row to open that file and go to the line in question.

## Requirements

* [Pre-built binaries](https://leakage-detector.vercel.app/download) for Windows, macOS, or Linux AND/OR [Docker](https://www.docker.com/) Desktop
* [NodeJS](https://nodejs.org/en/download) which is required to run the prebuilt binaries for Windows, MacOS, and Linux
* [Souffle](https://souffle-lang.github.io/install) which is required to run the prebuilt binaries for MacOS
* [Python extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
* [Jupyter Notebook extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter)
### Optional
* [Github Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) for additional quickfix suggestions

## Run Instructions
More detailed instructions with visuals can be found [here](https://leakage-detector.vercel.app/documentation/get-started/run-guide).

* Step 1: Launch Visual Studio Code. From the activity bar on the left, choose the "Data Leakage" extension.
* Step 2: Click on the gear icon in the top right to open the User Settings tab of the extension.
* Step 3: Choose your preferred run mode from the dropdown menu, either "Native" or "Docker."
* Step 3.1 - Native Mode: This mode uses a downloaded binary specific to your operating system. Selecting Native will display a link to this file. Download this zip file and proceed to step 4.
* Step 3.2: Selecting Docker requires no further steps and you may skip to step 5. Ensure you have Docker Desktop running in the background.
* Step 4: Once you have downloaded the zip file, locate and extract the folder. Then, return to VSCode and click the "Install" button. Navigate to where the folder was extracted and select it.
* Step 5: Return to the main extension page by clicking the run icon.
* Step 6: Open a Jupyter Notebook file in the active tab of VS Code. In the extension window, click "Run Data Leakage Analysis" to start the process.
* Step 7: Allow time for the extension to analyze the notebook for instances of data leakage. This may take a few minutes.
* Step 8: Once the analysis is complete, you will receive a notification at the bottom right of VS Code.
* Step 9: Review the "Leakage Overview" tab in the bottom panel of VS Code. It will show a summary of detected leakages and provide a detailed table of instances. Each instance can be examined by clicking on a row in the table.

### Fixing Data Leakage

* Step 1: Navigate to a data leakage instance by selecting a row in the leakage instances table.
* Step 2: The selected leakage instance will be highlighted in your Jupyter Notebook file.
* Step 3: Hover over the highlighted line with the red error to reveal the "Quick Fix" option
* Step 4: Click on "Quick Fix" to see several potential solutions. Then, you may select the light bulb icon to perform the manual Quick Fix or select the option “Fix using Copilot” to perform Copilot’s AI-based Quick Fix. You must have the GitHub Copilot VS Code extension to fix using Copilot, which is discussed in the installation guide and linked above as an optional requirement. These options attempt to resolve the data leakage.

* Manual Quick Fix: Select any light bulb icon to perform the manual Quick Fix. Your Jupyter Notebook will be updated to remove the data leakage instance. Note that these fixes are rudimentary and might not always be the optimal solution.
* Copilot Quick Fix: Select the option “Fix using Copilot” to perform GitHub Copilot’s AI-based Quick Fix. This will prompt a Copilot window to "Accept”, “Close” (reject), or “Accept & Run.” Please be aware that while GitHub Copilot can provide helpful suggestions, it might occasionally generate incorrect or suboptimal code solutions. Always review its recommendations critically before applying them.


## Known Issues


