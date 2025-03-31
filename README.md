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

## Known Issues


