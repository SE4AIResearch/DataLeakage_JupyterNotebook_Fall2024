# Leakage Detector

<img src="https://gcdnb.pbrd.co/images/xa9zRuVJO0ms.png?o=1" alt="Leakage Detector Poster Logo" width="400"/>

Visual Studio Code extension that detects instances of data leakage in Jupyter Notebooks.

## Features

Data leakage is a common problem in machine learning (ML) code where a model is trained on data that isn't in the training dataset. This skews the model results and causes an overly optimistic estimate of performance. This is why ML developers should separate data into three sets — training, evaluation, and a single-use test set — which many model makers overlook [(Yang et al.)](https://dl.acm.org/doi/10.1145/3551349.3556918). This extension will detect data leakage in Jupyter Notebooks (.ipynb) and suggest ways to fix it.

Leakage comes in three types:

- Multi-Test — the same test data is used in multiple evaluations
- Overlap — the training and test sets have shared data
- Preprocessing — the training and test sets are merged into the same set

The extension creates two tables in the bottom panel. "Leakage Summary" shows how many instances of each type there are. "Leakage Instances" isolates each instance, the line it's on, and the variable that caused it. The user can click on each row to open that file and go to the line in question.

## Requirements

- [Pre-built binaries](https://leakage-detector.vercel.app/download) for Windows, macOS, or Linux AND/OR [Docker](https://www.docker.com/) Desktop
- [NodeJS](https://nodejs.org/en/download) which is required to run the prebuilt binaries for Windows, MacOS, and Linux
- [Souffle](https://souffle-lang.github.io/install) which is required to run the prebuilt binaries for MacOS
- [Python extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
- [Jupyter Notebook extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter)

### Optional

- [Github Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) for additional quickfix suggestions

## Run Instructions

More detailed instructions with visuals can be found [here](https://leakage-detector.vercel.app/documentation/get-started/run-guide).

- Step 1: Launch Visual Studio Code. From the activity bar on the left, choose the "Data Leakage" extension.
- Step 2: Click on the gear icon in the top right to open the User Settings tab of the extension.
- Step 3: Choose your preferred run mode from the dropdown menu, either "Native" or "Docker."
- Step 3.1 - Native Mode: This mode uses a downloaded binary specific to your operating system. Selecting Native will display a link to this file. Download this zip file and proceed to step 4.
- Step 3.2: Selecting Docker requires no further steps and you may skip to step 5. Ensure you have Docker Desktop running in the background.
- Step 4: Once you have downloaded the zip file, locate and extract the folder. Then, return to VS Code and click the "Install" button. Navigate to where the folder was extracted and select it.
- Step 5: Return to the main extension page by clicking the run icon.
- Step 6: Open a Jupyter Notebook file in the active tab of VS Code. In the extension window, click "Run Data Leakage Analysis" to start the process.
- Step 7: Allow time for the extension to analyze the notebook for instances of data leakage. This may take a few minutes.
- Step 8: Once the analysis is complete, you will receive a notification at the bottom right of VS Code.
- Step 9: Review the "Leakage Overview" tab in the bottom panel of VS Code. It will show a summary of detected leakages and provide a detailed table of instances. Each instance can be examined by clicking on a row in the table.

### Fixing Data Leakage

- Step 1: Navigate to a data leakage instance by selecting a row in the leakage instances table.
- Step 2: The selected leakage instance will be highlighted in your Jupyter Notebook file.
- Step 3: Hover over the highlighted line with the red error to reveal the "Quick Fix" option
- Step 4: Click on "Quick Fix" to see several potential solutions. Then, you may select the light bulb icon to perform the manual Quick Fix or select the option “Fix using Copilot” to perform Copilot’s AI-based Quick Fix. You must have the GitHub Copilot VS Code extension to fix using Copilot, which is discussed in the installation guide and linked above as an optional requirement. These options attempt to resolve the data leakage.

- Manual Quick Fix: Select any light bulb icon to perform the manual Quick Fix. Next, a diff file is automatically generated for your reference. Then, our VS Code extension in the primary sidebar prompts you to accept or reject the Quick Fix changes. The left file of the diff displays your Jupyter Notebook and the right file of the diff displays the proposed changes. If changes are accepted, the Jupyter Notebook will be updated to remove the data leakage instance; otherwise, your file contents will remain the same. Note that these fixes might not always be the optimal solution.
- Copilot Quick Fix: Select the option “Fix using Copilot” to perform GitHub Copilot’s AI-based Quick Fix. This will prompt a Copilot window to "Accept”, “Close” (reject), or “Accept & Run.” Please be aware that while GitHub Copilot can provide helpful suggestions, it might occasionally generate incorrect or suboptimal code solutions. Always review its recommendations critically before applying them.

## Data Leakage Fix Techniques

Our extension's manual Quick Fix relies on these techniques to resolve the 3 types of data leakage: multi-test, overlap, and preprocessing.

### Multi-Test Leakage

The manual Quick Fix resolves multi-test leakage by introducing a new, independent test set that has not been reused or influenced by earlier evaluations. This ensures that the evaluation is conducted on data that was not involved in the training, providing a more accurate assessment of the model's performance.

A common example of multi-test leakage is shown below, where the variable X_test is evaluated multiple times across both the lr and ridge models, leading to an artificial inflation of performance metrics.

```py
import pandas as pd
from sklearn . feature_selection import SelectPercentile,chi2
from sklearn . model_selection import LinearRegression,Ridge, train_test_split
X_0 , y = load_data()

select = SelectPercentile ( chi2 , percentile =50)
select . fit ( X_0 )
X = select . transform ( X_0 )

X_train , y_train , X_test , y_test = train_test_split (X ,y)
lr = LinearRegression ()

lr . fit ( X_train , y_train )
lr_score = lr . score ( X_test , y_test )

ridge = Ridge ()
ridge . fit (X , y )
ridge_score = ridge . score ( X_test , y_test )
final_model = lr if lr_score > ridge_score else ridge
```

Our Quick Fix algorithm addresses multi-test leakages using the following steps:

1. Identify the reused test variable (e.g., X_test) that is evaluated multiple times across different models.
2. Insert a placeholder loading method, such as load_test_data(), to simulate retrieving a new, independent test dataset.
3. Create new test variables derived from the original test variable (e.g., X_X_test_new_0 and y_X_test_new) through the load_test_data() function.
4. Select a user-initialized model that performs transformations (for example, a scaler or preprocessor).
5. Apply the model’s transformation method (specifically looking for the transform keyword) to X_X_test_new_0, resulting in a transformed variable X_X_test_new.
6. Select the last user-initialized model capable of evaluation (for instance, a classifier or regressor).
7. Evaluate the selected model using the newly created X_X_test_new and y_X_test_new variables, ensuring that the evaluation does not reuse the original, potentially tainted test set.

After applying the manual Quick Fix, this code will be changed to the following:

```py
import pandas as pd
from sklearn . feature_selection import SelectPercentile,chi2
from sklearn . model_selection import LinearRegression,Ridge, train_test_split
X_0 , y = load_data()

select = SelectPercentile ( chi2 , percentile =50)
select . fit ( X_0 )
X = select . transform ( X_0 )

X_train , y_train , X_test , y_test = train_test_split (X ,y)
lr = LinearRegression ()

lr . fit ( X_train , y_train )
lr_score = lr . score ( X_test , y_test )

ridge = Ridge ()
ridge . fit (X , y )
ridge_score = ridge . score ( X_test , y_test )
final_model = lr if lr_score > ridge_score else ridge
X_X_test_new_0_0, y_X_test_new_0 = load_test_data()
X_X_test_new_0 = select.transform(X_X_test_new_0_0)
final_model.score(X_X_test_new_0_0, y_X_test_new_0)
```

### Overlap Leakage

The manual Quick Fix resolves overlap leakage by using independent test data for evaluation, ensuring that no data points from the training set are present in the test set. This ensures that the model evaluation and transformation processes are performed on entirely new data, preventing overlap between training and test data.

A common example of overlap leakage is shown below, where the variable X_train contains both training and test data because the RandomOverSampler was applied to the entire dataset (X and y) before the train_test_split, causing the resampled data (X_resampled) to include information from what would later become test data, thus creating overlap between training and testing sets.

```py
from sklearn.datasets import fetch_openml
from imblearn.datasets import make_imbalance
X, y = fetch_openml(
    data_id=1119, as_frame=True, return_X_y=True
)
X = X.select_dtypes(include="number")
X, y = make_imbalance(
    X, y, sampling_strategy={">50K": 300}, random_state=1
)
from sklearn.experimental import enable_hist_gradient_boosting
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import cross_validate

from imblearn.over_sampling import RandomOverSampler
from sklearn.model_selection import train_test_split
sampler = RandomOverSampler(random_state=0)
X_resampled, y_resampled = sampler.fit_resample(X, y)
X_train, X_test, y_train, y_test = train_test_split(X_resampled, y_resampled, test_size=0.2, random_state=0)
model = HistGradientBoostingClassifier(random_state=0)
model.fit(X_train, y_train)
model.predict(X_test)
```

Our Quick Fix algorithm addresses overlap leakages using the following steps:

1. Find the latest call to train_test_split in the code.
2. Identify the X_train and y_train outputs (typically the first and third elements of the returned tuple from scikit-learn’s train_test_split).
3. Replace the parameters of the offending fitting method with the correct X_train and y_train variables.

After applying the manual Quick Fix, this code will be changed to the following:

```py
from sklearn.datasets import fetch_openml
from imblearn.datasets import make_imbalance
X, y = fetch_openml(
    data_id=1119, as_frame=True, return_X_y=True
)
X = X.select_dtypes(include="number")
X, y = make_imbalance(
    X, y, sampling_strategy={">50K": 300}, random_state=1
)
from sklearn.experimental import enable_hist_gradient_boosting
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import cross_validate

from imblearn.over_sampling import RandomOverSampler
from sklearn.model_selection import train_test_split
sampler = RandomOverSampler(random_state=0)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=0)
X_resampled, y_resampled = sampler.fit_resample(X_train, y_train)


model = HistGradientBoostingClassifier(random_state=0)
model.fit(X_resampled, y_resampled)
model.predict(X_test)
```

### Preprocessing Leakage

The manual Quick Fix resolves preprocessing leakage by moving the preprocessing and feature selection steps after the train/test split and ensuring that any data-driven preprocessing steps are not influenced by test data. This ensures that only the training data influences the model training process, preserving the integrity of the evaluation.

A common example of preprocessing leakage is shown below, where there is no train/test split before the feature selection.

```py
import numpy as np
from sklearn.base import accuracy_score
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.feature_selection import SelectKBest
from sklearn.model_selection import train_test_split
# generate random data
n_samples , n_features , n_classes = 200 , 10000 , 2
rng = np . random . RandomState (42)
X = rng . standard_normal (( n_samples , n_features ) )
y = rng . choice ( n_classes , n_samples )
 # leak test data through feature selection
X_selected = SelectKBest ( k =25) . fit_transform (X , y )
X_train , X_test , y_train , y_test = train_test_split (X_selected , y , random_state =42)
gbc = GradientBoostingClassifier ( random_state =1)
gbc . fit ( X_train , y_train )
y_pred = gbc . predict ( X_test )
accuracy_score ( y_test , y_pred )
# expected accuracy ~0.5; reported accuracy 0.76
```

Our Quick Fix algorithm addresses preprocessing leakages using the following steps:

1. Locate the latest call to the train_test_split method.
2. Identify the X_train and X_test outputs of the split.
3. Find the lines where preprocessing occurs.
4. Move the train_test_split call upward, placing it before the preprocessing.
5. Assign the outputs of train_test_split to temporary variables (e.g., X_train_0 and X_test_0).
6. Apply all preprocessing and transformation methods to these temporary variables.
7. Have the results of preprocessing be the original X_train and X_test variables.

After applying the manual Quick Fix, this code will be changed to the following:

```py
import numpy as np
from sklearn.base import accuracy_score
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.feature_selection import SelectKBest
from sklearn.model_selection import train_test_split
# generate random data
n_samples , n_features , n_classes = 200 , 10000 , 2
rng = np . random . RandomState (42)
X = rng . standard_normal (( n_samples , n_features ) )
y = rng . choice ( n_classes , n_samples )
X_train_0 , X_test_0 , y_train , y_test = train_test_split (X_selected , y , random_state =42)
 # leak test data through feature selection
X_selected = SelectKBest ( k =25) . fit_transform (X , y )

fit_model.fit(X_train_0)
X_train = transform_model.transform(X_train_0)
X_test = transform_model.transform(X_test_0)
gbc = GradientBoostingClassifier ( random_state =1)
gbc . fit ( X_train , y_train )
y_pred = gbc . predict ( X_test )
accuracy_score ( y_test , y_pred )
# expected accuracy ~0.5; reported accuracy 0.76
```
