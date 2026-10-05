from flask import Flask, request, send_file
from io import BytesIO
import pandas as pd
from ml_model import IngredientRiskModel
from checker import check_ingredients, check_label

app = Flask(__name__)
model = IngredientRiskModel()

@app.get("/")
def home():
    return {"project":"LegalLens Food Ingredient Checker","endpoint":"POST /scan"}

@app.post("/scan")
def scan():
    ingredients = request.form.get("ingredients","").strip()
    label = request.form.get("label_text","").strip()
    diseases = [x.strip().lower() for x in request.form.get("diseases","").split(",") if x.strip()]
    if not ingredients:
        return {"error":"ingredients is required"}, 400

    result = check_ingredients(ingredients, diseases, model)
    label_result = check_label(label) if label else {"missing":[]}

    rows = [{
        "Ingredient": x["ingredient"],
        "Category": x["category"],
        "ML_Risk": x["ml_risk"],
        "Health_Concern": x["health_concern"],
        "Recommendation": x["recommendation"]
    } for x in result["items"]]

    rows.append({
        "Ingredient":"OVERALL",
        "Category":"SUMMARY",
        "ML_Risk":result["overall_risk"],
        "Health_Concern":"; ".join(result["health_flags"]) or "None detected",
        "Recommendation":result["overall_recommendation"]
    })

    rows.append({
        "Ingredient":"LABEL_CHECK",
        "Category":"CONSUMER INFORMATION",
        "ML_Risk":"",
        "Health_Concern":"",
        "Recommendation":("Missing: " + ", ".join(label_result["missing"]))
          if label_result["missing"] else "Core fields detected"
    })

    out=BytesIO()
    pd.DataFrame(rows).to_csv(out,index=False)
    out.seek(0)
    return send_file(out,mimetype="text/csv",as_attachment=True,
                     download_name="LegalLens_food_report.csv")

if __name__=="__main__":
    app.run(debug=True)
