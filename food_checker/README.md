# LegalLens Food Ingredient Checker

A small Flask + scikit-learn module for screening packaged-food ingredient text.

## Data/reference basis
The project uses public consumer-information material from India's Department of Consumer Affairs as a reference for label-field checks. It should not be presented as an official DoCA/FSSAI compliance engine.

## Start
```bash
cd food_checker
pip install -r requirements.txt
python app.py
```

POST form fields to /scan:
- ingredients
- label_text (optional)
- diseases (comma separated: diabetes, hypertension, high cholesterol)

The endpoint returns a CSV report.

For a production version, add a versioned dataset with source URL, publication date, rule ID and evidence text for every rule.
