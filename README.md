# LegalLens

## Smart India Hackathon 2026

LegalLens is an AI-assisted packaged-food scanning and screening prototype.

### End-to-end food scan

**Single photo → OCR → product/ingredient/nutrition extraction → health screening → complete report → automatic PDF download**

The GitHub Pages scanner uses Tesseract.js in the browser. The optional Python API provides a YOLO11 + PaddleOCR vision pipeline and can be deployed separately.

### Current scanner features

- Single food-package photo/camera capture
- OCR label reading
- Product and nutrition extraction
- Ingredient, allergen and additive detection
- Personal health-profile inputs
- Research ML screening architecture with abstention/review concept
- Government/Legal Metrology declaration checks
- Complete PDF report generated after a successful scan
- CSV export for structured results
- Browser-local scan storage

### ML pipeline

SCAN → OCR → FEATURE EXTRACTION → ML RISK SCREEN → ABSTAIN/REVIEW → REPORT

The repository contains a research-grade pipeline architecture, not a claim of clinical validation.

#### ML files

- `ml/train.py` — grouped train/calibration/test training pipeline
- `ml/evaluate.py` — locked-test evaluation metrics
- `ml/predict.py` — local probability inference with abstention
- `ml/dataset_schema.csv` — research-data schema
- `ml/MODEL_CARD.md` — model purpose and limitations
- `ml/train_product_classifier.py` — product-quality/market-label research classifier training scaffold
- `ml-model.json` — model metadata and validation policy

### Vision API

`api/main.py` exposes `POST /api/v2/scan` for image analysis and `GET /health` for service health. CORS is enabled so a separately deployed frontend can call the API.

The custom YOLO label classes require fine-tuned weights; the default pretrained YOLO11 model does not automatically recognize LegalLens food-label classes.

### Search limitation

Live product web search is intentionally **not simulated or falsely claimed** in the browser demo. A deployed backend can connect an approved search/product-data API, then merge product evidence with OCR and nutrition data before report generation. Direct Google-result scraping is not part of this repository.

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

### Disclaimer

LegalLens is an AI-assisted screening and research system. The clinical-nutrition model is **not clinically validated** and does not provide a diagnosis, treatment decision, emergency decision, medication change, or definitive safe/unsafe food determination. Results should be reviewed by an appropriately qualified professional in research or decision-support use.
