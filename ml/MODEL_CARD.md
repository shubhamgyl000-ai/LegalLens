# LegalLens Clinical Nutrition Screening Model

## Status
**Research prototype — not clinically validated.**

This model is an interpretable, calibrated logistic-regression screening model. It estimates a binary risk label from packaged-food nutrition/ingredient signals and a selected health condition.

## Inputs
- sugars per 100 g
- sodium per 100 g
- saturated fat per 100 g
- fiber per 100 g
- protein per 100 g
- potassium per 100 g
- phosphorus per 100 g
- gluten signal
- OCR uncertainty
- serving size
- selected condition

## Training design
The pipeline requires subject/group-aware splitting so records from the same subject are not placed across train and test sets. A separate calibration split is used before final test evaluation.

Probability calibration uses sigmoid/Platt scaling. scikit-learn documents calibrated classifiers and independent calibration data.

## Evaluation
The pipeline reports:
- AUROC
- AUPRC
- Brier score
- sensitivity
- specificity
- PPV
- NPV

Do not interpret any metric from the optional synthetic demo as clinical performance.

## Data requirements
The real dataset must be appropriately consented/de-identified research data with a predefined label definition and a defensible reference standard. Do not upload patient-identifiable information.

## Intended use
Research and clinician-reviewed dietary decision-support prototyping.

## Not intended for
- diagnosis
- treatment decisions
- emergency decisions
- medication changes
- definitive safe/unsafe food determinations

## Reproducibility
Run: python ml/train.py --demo-synthetic

For actual research training: python ml/train.py --data data/clinical_training.csv

Evaluate a locked test set with: python ml/evaluate.py --data data/clinical_test.csv

Training success does not establish clinical validity.
