"""Local inference for the trained LegalLens research model."""
from pathlib import Path
import argparse,json,joblib,pandas as pd
ROOT=Path(__file__).resolve().parents[1]
F=["sugars_g_per_100g","sodium_mg_per_100g","sat_fat_g_per_100g","fiber_g_per_100g","protein_g_per_100g","potassium_mg_per_100g","phosphorus_mg_per_100g","gluten_signal","ocr_uncertainty","serving_size_g","condition"]
ap=argparse.ArgumentParser(); ap.add_argument("--model",default=str(ROOT/"ml/artifacts/legal_lens_calibrated.joblib")); ap.add_argument("--input",required=True); a=ap.parse_args()
m=joblib.load(a.model); row=json.loads(a.input); missing=[x for x in F if x not in row]
if missing: raise SystemExit("Missing features: "+", ".join(missing))
df=pd.DataFrame([row],columns=F); prob=float(m.predict_proba(df)[0,1]); completeness=1-sum(pd.isna(df[x].iloc[0]) for x in F)/len(F)
print(json.dumps({"risk_probability":prob,"abstain":completeness<.65 or float(row["ocr_uncertainty"])>.35,"model_status":"research_prototype_not_clinically_validated","clinical_note":"Screening research output only; not a diagnosis or definitive safe/unsafe decision."},indent=2))
