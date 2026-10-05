import re

KNOWN={
"sugar":("Added sugar","high"),"glucose syrup":("Added sugar","high"),
"fructose":("Added sugar","high"),"corn syrup":("Added sugar","high"),
"salt":("Sodium","moderate"),"sodium chloride":("Sodium","moderate"),
"hydrogenated oil":("Trans-fat concern","high"),
"partially hydrogenated":("Trans-fat concern","high"),
"sodium benzoate":("Preservative","moderate"),
"potassium sorbate":("Preservative","moderate"),
"tartrazine":("Artificial colour","moderate"),
"sunset yellow":("Artificial colour","moderate"),
"aspartame":("Artificial sweetener","moderate"),
"sucralose":("Artificial sweetener","moderate"),
"saccharin":("Artificial sweetener","moderate"),
"milk":("Milk allergen","allergen"),"whey":("Milk allergen","allergen"),
"casein":("Milk allergen","allergen"),"peanut":("Peanut allergen","allergen"),
"groundnut":("Peanut allergen","allergen"),"almond":("Tree-nut allergen","allergen")
}

HEALTH={
"diabetes":{"added sugar":"Limit added sugars and compare carbohydrate per serving."},
"hypertension":{"sodium":"Prefer lower-sodium choices and compare sodium per serving."},
"high cholesterol":{"trans-fat concern":"Avoid partially hydrogenated oils and compare saturated/trans fat."}
}

def split_ingredients(s):
    return [x.strip() for x in re.split(r",|;|\n",s) if x.strip()]

def check_ingredients(text,diseases,model):
    ranks={"low":0,"moderate":1,"high":2,"allergen":2}
    items=[]; flags=[]; overall=0
    for raw in split_ingredients(text):
        low=raw.lower(); category=None; known=None
        for key,val in KNOWN.items():
            if key in low: category,known=val; break
        risk=known or model.predict(raw)
        health=[]
        for disease in diseases:
            for trigger,msg in HEALTH.get(disease,{}).items():
                if trigger in (category or "").lower():
                    health.append(f"{disease}: {msg}")
        if health: flags.extend(health)
        overall=max(overall,ranks.get(risk,0))
        items.append({"ingredient":raw,"category":category or "General ingredient",
                      "ml_risk":risk,"health_concern":" | ".join(health) or "None",
                      "recommendation":health[0].split(": ",1)[1] if health else
                        "Review serving size and the full nutrition label."})
    name={0:"LOW",1:"MODERATE",2:"HIGH"}[overall]
    return {"items":items,"overall_risk":name,"health_flags":flags,
            "overall_recommendation":"Review flagged ingredients and serving sizes; this is an educational screening, not medical advice."}

def check_label(text):
    fields={
      "manufacturer/packer/importer":r"manufacturer|packer|importer",
      "product name":r"name|product",
      "net quantity":r"net\s*(quantity|wt|weight)|\b\d+(?:\.\d+)?\s*(g|kg|ml|l)\b",
      "manufacture date":r"manufactur|mfg|mfd",
      "best before/use by":r"best\s*before|use\s*by|expiry|exp",
      "MRP":r"\bmrp\b|maximum retail",
      "consumer care":r"consumer\s*(care|complaint|helpline)|customer\s*care"
    }
    return {"missing":[n for n,p in fields.items() if not re.search(p,text,re.I)]}
