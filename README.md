# LegalLens

## Smart India Hackathon 2026

LegalLens is an AI-assisted packaged-food and commodity compliance screening prototype.

It combines:
- Product image capture
- OCR
- Ingredient/nutrition extraction
- Rule-based compliance screening
- Clinical-nutrition ML research pipeline
- Evidence reporting
- Human review

## Food health ML pipeline

The repository now contains a research-grade pipeline architecture, not a claim of clinical validation.

Workflow:

SCAN → OCR → FEATURE EXTRACTION → ML RISK SCREEN → ABSTAIN/REVIEW → REPORT

### ML files

- `ml/train.py` — grouped train/calibration/test training pipeline
- `ml/evaluate.py` — locked-test AUROC/AUPRC/Brier/sensitivity/specificity/PPV/NPV
- `ml/predict.py` — local probability inference with abstention
- `ml/dataset_schema.csv` — required research-data schema
- `ml/MODEL_CARD.md` — model purpose, limitations, and validation requirements
- `ml/requirements.txt` — Python dependencies
- `ml/artifacts/` — generated model artifacts
- `data/clinical_training.csv` — entry point for approved research data

### Training

For software-pipeline testing only:

```bash
python -m pip install -r ml/requirements.txt
python ml/train.py --demo-synthetic
```

Synthetic data are **not clinical evidence** and must not be reported as model accuracy.

For approved research data:

```bash
python ml/train.py --data data/clinical_training.csv
```

The training code keeps records from the same `subject_id` in the same split and uses a separate calibration split.

Evaluate a locked test set:

```bash
python ml/evaluate.py --data data/clinical_test.csv
```

Run a prediction:

```bash
python ml/predict.py --input '{"sugars_g_per_100g":10,"sodium_mg_per_100g":250,"sat_fat_g_per_100g":3,"fiber_g_per_100g":4,"protein_g_per_100g":6,"potassium_mg_per_100g":200,"phosphorus_mg_per_100g":100,"gluten_signal":0,"ocr_uncertainty":0.1,"serving_size_g":30,"condition":"diabetes"}'
```

### Automated test

`.github/workflows/ml-test.yml` installs dependencies, compiles the Python files, runs the synthetic pipeline test, and verifies generated artifacts on relevant pushes/PRs.

## Compliance workflow

SCAN → OCR → VERIFY → REPORT

The intended production architecture can connect:

Frontend
↓
API
↓
YOLO/PaddleOCR
↓
Ingredient + nutrition extraction
↓
Rule engine + ML screening
↓
PostgreSQL/Object Storage
↓
Evidence/health report

## Disclaimer

LegalLens is an AI-assisted screening and research system.

The clinical-nutrition model is **not clinically validated** and does not provide a diagnosis, treatment decision, emergency decision, medication change, or definitive safe/unsafe food determination. Results should be reviewed by an appropriately qualified professional in research or decision-support use.

Low-confidence or potentially non-compliant commodity results should be reviewed by an authorized human officer.
