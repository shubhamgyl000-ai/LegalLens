from flask import Flask,request,send_file,render_template_string
from werkzeug.utils import secure_filename
import os,tempfile
from ocr import extract_text
from ml_model import IngredientRiskModel
from checker import check_ingredients,check_label
from report import make_pdf

app=Flask(__name__)
model=IngredientRiskModel()
HTML='''<!doctype html><html><head><title>LegalLens Scanner</title>
<style>body{font-family:Arial;max-width:850px;margin:40px auto;padding:20px;background:#f4f7fa}.card{background:white;padding:28px;border-radius:16px}button{padding:12px 18px;background:#003366;color:white;border:0;border-radius:8px}input,select{padding:10px;margin:8px 0 18px;width:100%;box-sizing:border-box}</style></head>
<body><div class="card"><h1>LegalLens Food Scanner</h1>
<p>Upload a food-package image. OCR extracts label text, then ML screening creates CSV and PDF reports.</p>
<form method="post" enctype="multipart/form-data">
<input type="file" name="image" accept="image/*" required>
<input name="diseases" placeholder="Optional: diabetes, hypertension, high cholesterol">
<button>Scan Package</button></form></div></body></html>'''

@app.route("/",methods=["GET","POST"])
def scan():
    if request.method=="GET": return render_template_string(HTML)
    f=request.files.get("image")
    if not f: return "Image required",400
    diseases=[x.strip().lower() for x in request.form.get("diseases","").split(",") if x.strip()]
    with tempfile.TemporaryDirectory() as d:
        image=os.path.join(d,secure_filename(f.filename or "label.jpg")); f.save(image)
        text=extract_text(image)
        # Basic extraction: use the full OCR text as the ingredient input when a
        # dedicated "Ingredients:" section is not detected.
        import re
        m=re.search(r"(?:ingredients?|composition)\s*[:\-]?\s*(.*)",text,re.I|re.S)
        ingredients=(m.group(1).split("\n\n")[0] if m else text)
        result=check_ingredients(ingredients,diseases,model)
        label=check_label(text)
        csv=os.path.join(d,"LegalLens_food_report.csv")
        pdf=os.path.join(d,"LegalLens_food_report.pdf")
        import pandas as pd
        rows=[{"Ingredient":x["ingredient"],"Category":x["category"],"ML_Risk":x["ml_risk"],"Health_Concern":x["health_concern"],"Recommendation":x["recommendation"]} for x in result["items"]]
        rows.append({"Ingredient":"OVERALL","Category":"SUMMARY","ML_Risk":result["overall_risk"],"Health_Concern":"; ".join(result["health_flags"]),"Recommendation":result["overall_recommendation"]})
        pd.DataFrame(rows).to_csv(csv,index=False)
        make_pdf(pdf,result,text,label,diseases)
        # Return the PDF first; the CSV is also available through the response headers
        return send_file(pdf,as_attachment=True,download_name="LegalLens_food_report.pdf")
if __name__=="__main__": app.run(debug=True)
