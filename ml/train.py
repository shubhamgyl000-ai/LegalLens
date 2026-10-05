"""LegalLens clinical-nutrition ML training pipeline.
Synthetic mode is for software testing only; it is never clinical validation.
"""
from pathlib import Path
import argparse,json
import numpy as np
import pandas as pd
import joblib
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score,average_precision_score,brier_score_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder,StandardScaler
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import GroupShuffleSplit

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"; MODEL_DIR=ROOT/"ml"/"artifacts"
NUMERIC=["sugars_g_per_100g","sodium_mg_per_100g","sat_fat_g_per_100g","fiber_g_per_100g","protein_g_per_100g","potassium_mg_per_100g","phosphorus_mg_per_100g","gluten_signal","ocr_uncertainty","serving_size_g"]
CATEGORICAL=["condition"]; REQUIRED=["record_id","subject_id","food_id","condition",*NUMERIC,"label"]

def make_demo(n=1200,seed=42):
    rng=np.random.default_rng(seed); rows=[]
    for i in range(n):
        c=rng.choice(["diabetes","hypertension","kidney","celiac","sugar_restriction"])
        sugar=rng.uniform(0,30); sodium=rng.uniform(20,1200); sat=rng.uniform(0,15)
        fiber=rng.uniform(0,12); protein=rng.uniform(0,20); potassium=rng.uniform(20,900)
        phosphorus=rng.uniform(10,500); gluten=float(rng.random()<.15); unc=rng.uniform(0,.25); serving=rng.uniform(20,100)
        risk=(c in ["diabetes","sugar_restriction"])*sugar/25+(c=="hypertension")*sodium/1000
        risk+=(c=="kidney")*(potassium/800+phosphorus/450)+(c=="celiac")*gluten*1.8
        risk+=sat/25-fiber/30+rng.normal(0,.18)
        rows.append([f"demo-{i}",f"subject-{i%240}",f"food-{i%180}",c,sugar,sodium,sat,fiber,protein,potassium,phosphorus,gluten,unc,serving,int(risk>.75)])
    return pd.DataFrame(rows,columns=REQUIRED)

def validate(df):
    missing=[c for c in REQUIRED if c not in df.columns]
    if missing: raise ValueError("Missing columns: "+", ".join(missing))
    df=df.copy()
    for c in NUMERIC+["label"]: df[c]=pd.to_numeric(df[c],errors="coerce")
    df=df.dropna(subset=["subject_id","condition","label"])
    if not set(df.label.unique()).issubset({0,1}) or df.label.nunique()<2: raise ValueError("label must contain both 0 and 1.")
    if len(df)<100: raise ValueError("At least 100 labeled records are required.")
    return df

def split(df,test_size,seed):
    g=GroupShuffleSplit(n_splits=1,test_size=test_size,random_state=seed)
    a,b=next(g.split(df,df.label,groups=df.subject_id))
    return df.iloc[a].reset_index(drop=True),df.iloc[b].reset_index(drop=True)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--data",default=str(DATA/"clinical_training.csv")); ap.add_argument("--demo-synthetic",action="store_true"); ap.add_argument("--seed",type=int,default=42); args=ap.parse_args()
    if args.demo_synthetic: df=make_demo(seed=args.seed); status="synthetic_pipeline_test_only"
    else:
        p=Path(args.data)
        if not p.exists(): raise SystemExit(f"Dataset not found: {p}")
        df=pd.read_csv(p); status="research_dataset"
    df=validate(df); train,test=split(df,.20,args.seed); train,calib=split(train,.20,args.seed+1)
    pre=ColumnTransformer([
        ("num",Pipeline([("impute",SimpleImputer(strategy="median",add_indicator=True)),("scale",StandardScaler())]),NUMERIC),
        ("cat",Pipeline([("impute",SimpleImputer(strategy="most_frequent")),("onehot",OneHotEncoder(handle_unknown="ignore"))]),CATEGORICAL)])
    base=Pipeline([("pre",pre),("clf",LogisticRegression(max_iter=3000,class_weight="balanced",C=1.0))])
    base.fit(train[NUMERIC+CATEGORICAL],train.label)
    try:
        from sklearn.frozen import FrozenEstimator
        calibrated=CalibratedClassifierCV(FrozenEstimator(base),method="sigmoid")
    except ImportError:
        calibrated=CalibratedClassifierCV(base,method="sigmoid",cv="prefit")
    calibrated.fit(calib[NUMERIC+CATEGORICAL],calib.label)
    p=calibrated.predict_proba(test[NUMERIC+CATEGORICAL])[:,1]
    metrics={"n_total":len(df),"n_train":len(train),"n_calibration":len(calib),"n_test":len(test),
             "auroc":roc_auc_score(test.label,p),"auprc":average_precision_score(test.label,p),
             "brier_score":brier_score_loss(test.label,p),"positive_rate_test":test.label.mean(),"data_status":status}
    MODEL_DIR.mkdir(parents=True,exist_ok=True); joblib.dump(calibrated,MODEL_DIR/"legal_lens_calibrated.joblib")
    (MODEL_DIR/"metrics.json").write_text(json.dumps(metrics,indent=2,default=float))
    meta={"model_name":"LegalLens Clinical Nutrition Screening Model","version":"0.2.0-research",
          "status":"research_prototype_not_clinically_validated","features":NUMERIC+CATEGORICAL,"target":"label",
          "split":"subject-grouped train/calibration/test","calibration":"sigmoid/Platt scaling","data_status":status}
    (MODEL_DIR/"model_metadata.json").write_text(json.dumps(meta,indent=2))
    print(json.dumps(metrics,indent=2,default=float))
if __name__=="__main__": main()
