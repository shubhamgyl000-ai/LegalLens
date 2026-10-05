"""Evaluate a locked test set with a trained LegalLens model."""
from pathlib import Path
import argparse,json,joblib,pandas as pd
from sklearn.metrics import roc_auc_score,average_precision_score,brier_score_loss,confusion_matrix
ROOT=Path(__file__).resolve().parents[1]
N=["sugars_g_per_100g","sodium_mg_per_100g","sat_fat_g_per_100g","fiber_g_per_100g","protein_g_per_100g","potassium_mg_per_100g","phosphorus_mg_per_100g","gluten_signal","ocr_uncertainty","serving_size_g"]; C=["condition"]
ap=argparse.ArgumentParser(); ap.add_argument("--data",required=True); ap.add_argument("--model",default=str(ROOT/"ml/artifacts/legal_lens_calibrated.joblib")); ap.add_argument("--threshold",type=float,default=.5); a=ap.parse_args()
df=pd.read_csv(a.data); m=joblib.load(a.model); p=m.predict_proba(df[N+C])[:,1]; y=df.label.astype(int); pred=(p>=a.threshold).astype(int)
tn,fp,fn,tp=confusion_matrix(y,pred,labels=[0,1]).ravel()
o={"n":len(df),"auroc":roc_auc_score(y,p),"auprc":average_precision_score(y,p),"brier_score":brier_score_loss(y,p),"sensitivity":tp/(tp+fn) if tp+fn else None,"specificity":tn/(tn+fp) if tn+fp else None,"ppv":tp/(tp+fp) if tp+fp else None,"npv":tn/(tn+fn) if tn+fn else None,"threshold":a.threshold}
print(json.dumps(o,indent=2,default=float))
