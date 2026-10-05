"""Train the LegalLens product classifier.

This is a research prototype. It can train on a real labelled CSV when one is
available. With --demo-synthetic it creates rule-derived examples only for
software testing; those examples are NOT evidence of product quality,
authenticity, or health outcomes.
"""
from pathlib import Path
import argparse, json
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
import joblib

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "ml" / "artifacts"
FEATURES = [
    "sugar_g_per_100g","sodium_mg_per_100g","sat_fat_g_per_100g",
    "fiber_g_per_100g","protein_g_per_100g","additive_signal",
    "label_declaration_count","fssai_present","manufacturer_present","mrp_present"
]
TARGET = "health_class"

def make_demo(n=2000, seed=42):
    rng=np.random.default_rng(seed); rows=[]
    for i in range(n):
        sugar=rng.uniform(0,45); sodium=rng.uniform(0,1800); sat=rng.uniform(0,20)
        fiber=rng.uniform(0,15); protein=rng.uniform(0,25); additives=rng.binomial(1,.45)
        decl=int(rng.integers(1,8)); fssai=int(rng.random()<.85); manufacturer=int(rng.random()<.9); mrp=int(rng.random()<.9)
        score=.55 + fiber/45 + protein/100 - sugar/100 - sodium/4500 - sat/60 - additives*.04
        health="healthier_signal" if score>=.55 else "less_healthy_signal"
        rows.append([sugar,sodium,sat,fiber,protein,additives,decl,fssai,manufacturer,mrp,health])
    return pd.DataFrame(rows,columns=FEATURES+[TARGET])

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--data",default=str(ROOT/"data/product_training.csv"))
    ap.add_argument("--demo-synthetic",action="store_true")
    ap.add_argument("--seed",type=int,default=42)
    a=ap.parse_args()
    if a.demo_synthetic:
        df=make_demo(seed=a.seed); status="synthetic_rule_derived_test_only"
    else:
        df=pd.read_csv(a.data); status="real_labelled_dataset"
    required=FEATURES+[TARGET]
    missing=[x for x in required if x not in df.columns]
    if missing: raise SystemExit("Missing columns: "+", ".join(missing))
    df=df.dropna(subset=[TARGET])
    if len(df)<100 or df[TARGET].nunique()<2: raise SystemExit("Need at least 100 labelled rows and two health classes.")
    X=df[FEATURES]; y=df[TARGET]
    numeric=FEATURES
    pre=ColumnTransformer([("num",Pipeline([("impute",SimpleImputer(strategy="median")),("scale",StandardScaler())]),numeric)])
    model=Pipeline([("pre",pre),("clf",LogisticRegression(max_iter=3000,class_weight="balanced"))])
    model.fit(X,y)
    pred=model.predict(X)
    print(classification_report(y,pred,zero_division=0))
    MODEL_DIR.mkdir(parents=True,exist_ok=True)
    joblib.dump(model,MODEL_DIR/"product_health_classifier.joblib")
    meta={"model_name":"LegalLens Product Health Classifier","version":"0.1.0-research",
          "status":"research_prototype_not_validated","data_status":status,
          "target":TARGET,"features":FEATURES,
          "authenticity_note":"This model does not classify products as original/counterfeit. Authenticity requires authoritative source verification."}
    (MODEL_DIR/"product_model_metadata.json").write_text(json.dumps(meta,indent=2))
if __name__=="__main__": main()
