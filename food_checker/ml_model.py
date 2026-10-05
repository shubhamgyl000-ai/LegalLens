from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

class IngredientRiskModel:
    def __init__(self):
        samples = [
            "sugar glucose fructose corn syrup",
            "salt sodium sodium chloride",
            "hydrogenated oil partially hydrogenated trans fat",
            "sodium benzoate potassium sorbate preservative",
            "tartrazine sunset yellow artificial colour",
            "aspartame sucralose saccharin sweetener",
            "whole wheat flour oats rice flour",
            "milk whey casein",
            "peanut groundnut almond",
            "citric acid vitamin c",
            "water natural spices",
            "protein fibre"
        ]
        labels=["high","moderate","high","moderate","moderate","moderate",
                "low","allergen","allergen","low","low","low"]
        self.v=TfidfVectorizer(ngram_range=(1,2),lowercase=True)
        self.m=LogisticRegression(max_iter=1000)
        self.m.fit(self.v.fit_transform(samples),labels)

    def predict(self,text):
        return self.m.predict(self.v.transform([text]))[0]
