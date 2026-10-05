from flask import Flask, request, send_file, render_template_string
from werkzeug.utils import secure_filename
import tempfile, os, re
from ocr import extract_text
from ml_model import IngredientRiskModel
from checker import check_ingredients, check_label
from integrated_report import build_pdf_report

app = Flask(__name__)
model = IngredientRiskModel()

PAGE = """<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LegalLens - Product & Health Scanner</title>
<style>body{font-family:Arial;background:#f4f7fa;max-width:900px;margin:35px auto;padding:20px}.card{background:#fff;padding:30px;border-radius:18px;box-shadow:0 8px 30px #0001}h1{color:#003366}input,button{padding:12px;margin:8px 0}input[type=file],input[type=text]{width:100%;box-sizing:border-box}button{background:#003366;color:#fff;border:0;border-radius:8px;font-weight:bold;cursor:pointer}.note{color:#667085}</style></head>
<body><div class="card"><h1>LegalLens</h1><h2>AI Product + Health Food Scanner</h2>
<p>Upload a packaged-food image. OCR extracts the label, ML screens ingredients, health rules check the selected profile, and label fields are screened.</p>
<form method="post" enctype="multipart/form-data"><input type="file" name="image" accept="image/*" required>
<input type="text" name="diseases" placeholder="Optional: diabetes, hypertension, high cholesterol">
<button type="submit">SCAN & GENERATE PDF</button></form>
<p class="note">Final output: one PDF report only. Educational prototype; not medical diagnosis or official certification.</p>
</div></body></html>"""

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "GET":
        return render_template_string(PAGE)
    f = request.files.get("image")
    if not f or not f.filename:
        return "Food-package image is required", 400
    diseases = [x.strip().lower() for x in request.form.get("diseases", "").split(",") if x.strip()]
    with tempfile.TemporaryDirectory() as d:
        image = os.path.join(d, secure_filename(f.filename))
        f.save(image)
        try:
            ocr_text = extract_text(image)
        except Exception as e:
            return f"OCR failed: {e}. Install Tesseract OCR and ensure it is on PATH.", 500

        match = re.search(r"(?:ingredients?|composition)\s*[:\-]\s*(.*)", ocr_text, re.I | re.S)
        ingredients = match.group(1).strip() if match else ocr_text
        ingredients = re.split(r"\n\s*\n|nutrition facts|nutritional information|allergen", ingredients, flags=re.I)[0]

        result = check_ingredients(ingredients, diseases, model)
        label_result = check_label(ocr_text)
        pdf_path = os.path.join(d, "LegalLens_Product_Health_Report.pdf")
        build_pdf_report(pdf_path, result, label_result, ocr_text, diseases)
        return send_file(pdf_path, as_attachment=True, download_name="LegalLens_Product_Health_Report.pdf", mimetype="application/pdf")

if __name__ == "__main__":
    app.run(debug=True)
