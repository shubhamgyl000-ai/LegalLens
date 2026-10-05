# LegalLens — AI Food Product + Health Scanner

LegalLens is an educational prototype that scans a packaged-food label image and produces **one final PDF report** containing:
- OCR-extracted package text
- ML-based ingredient risk screening using TF-IDF + Logistic Regression
- Known ingredient/risk rules
- Optional health-profile screening for diabetes, hypertension and high cholesterol
- Product-level recommendation
- Core packaged-commodity label-field screening
- Health recommendations and detected flags
- Methodology and safety disclaimer

## Final workflow
**Upload image → OCR → ingredient extraction → ML screening → health rules → label screening → final PDF**

The web app is `food_checker/integrated_app.py`.

## Run locally
```bash
cd food_checker
pip install -r requirements.txt
python integrated_app.py
```

Open `http://127.0.0.1:5000`.

### Windows OCR requirement
The Python package `pytesseract` is only a wrapper. Install the Tesseract OCR engine separately and make sure `tesseract.exe` is available on PATH. If it is not on PATH, set `pytesseract.pytesseract.tesseract_cmd` in `ocr.py` to the installed executable path.

## Health input
Enter a comma-separated profile, for example:
`diabetes, hypertension`

Supported prototype profiles:
- diabetes
- hypertension
- high cholesterol

## Important limitation
The ML model uses a small prototype training set and deterministic rules. It is **not a clinical model** and must not be used to diagnose disease or replace professional medical advice. The label screen is also not an official FSSAI or Legal Metrology compliance certification.

For a production system, replace the prototype model with a validated dataset/model, authoritative current regulatory rules, stronger OCR, versioned evidence, and human review.