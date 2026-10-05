# LegalLens prototype ML training
# pip install numpy scikit-learn
# This script creates a demonstration logistic-regression classifier.
# Replace the demonstration dataset with clinically validated, appropriately
# consented nutrition/clinical data before real-world medical use.
import json
import numpy as np
from sklearn.linear_model import LogisticRegression

rng=np.random.default_rng(42)
X=[]; y=[]
for _ in range(6000):
    sugar=rng.uniform(0,30); sodium=rng.uniform(0,1000)
    sat=rng.uniform(0,15); calories=rng.uniform(50,600); disease=rng.integers(0,4)
    one=[int(disease==i) for i in range(4)]
    if disease==0: risk=sugar/12+rng.normal(0,.3)
    elif disease==1: risk=sodium/350+rng.normal(0,.3)
    elif disease==2: risk=sat/5+sodium/900+calories/800+rng.normal(0,.3)
    else: risk=sodium/500+rng.normal(0,.3)
    X.append([sugar,sodium,sat,calories]+one); y.append(int(risk>1.0))

model=LogisticRegression(max_iter=2000).fit(X,y)
out={"model":"logistic_regression_demo","version":"1.0",
"features":["sugar_g_per_100g","sodium_mg_per_100g","saturated_fat_g_per_100g","calories_per_100g","diabetes","hypertension","heart","kidney"],
"weights":model.coef_[0].tolist(),"bias":float(model.intercept_[0]),"threshold":0.5,
"note":"Prototype only; not clinically validated."}
with open("data/food_health_model.json","w") as f: json.dump(out,f,indent=2)
print("Model exported to data/food_health_model.json")