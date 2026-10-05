const hasDisease=document.getElementById("hasDisease");
const diseaseSection=document.getElementById("diseaseSection");
hasDisease.addEventListener("change",()=>diseaseSection.style.display=hasDisease.value==="yes"?"block":"none");

document.getElementById("healthForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const conditions=hasDisease.value==="yes"
  ? [...document.querySelectorAll("#diseaseSection input:checked")].map(x=>x.value):[];
 if(hasDisease.value==="yes"&&conditions.length===0){alert("Please select at least one diagnosed condition.");return;}
 const scan=JSON.parse(localStorage.getItem("legalLensReport")||"{}");
 const values={
  sugar:parseFloat(document.getElementById("sugar").value)||0,
  sodium:parseFloat(document.getElementById("sodium").value)||0,
  satFat:parseFloat(document.getElementById("satFat").value)||0,
  calories:parseFloat(document.getElementById("calories").value)||0
 };
 const health={hasDisease:hasDisease.value,conditions,foodName:document.getElementById("foodName").value.trim()||scan.product||"Scanned food",...values,date:new Date().toISOString()};
 const model=await fetch("data/food_health_model.json").then(r=>r.json());
 const flags=conditions.length?conditions.map(c=>predict(model,values,c)):["No disease-specific restriction selected"];
 const foodReport={product:health.foodName,conditions:conditions.join("; ")||"None reported",nutrition:values,predictions:flags,disclaimer:"Prototype ML screening only. Not a diagnosis, prescription, or substitute for a clinician/dietitian."};
 localStorage.setItem("legalLensHealth",JSON.stringify(health));
 localStorage.setItem("legalLensFoodReport",JSON.stringify(foodReport));
 downloadCSV(health,foodReport);
 window.location.href="report.html";
});

function predict(model,v,disease){
 const one=[disease==="diabetes"?1:0,disease==="hypertension"?1:0,disease==="heart"?1:0,disease==="kidney"?1:0];
 const x=[v.sugar,v.sodium,v.satFat,v.calories,...one];
 let z=model.bias; for(let i=0;i<x.length;i++)z+=model.weights[i]*x[i];
 const p=1/(1+Math.exp(-z));
 let action=p>=model.threshold?"LIMIT / AVOID":"GENERALLY OK / CHECK PORTION";
 if(disease==="kidney") action=p>=model.threshold?"LIMIT / AVOID":"ASK CLINICIAN";
 return {condition:disease,probability:Math.round(p*100),suggestion:action};
}
function downloadCSV(h,r){
 const rows=[["Date","Food","Condition","Sugar_g_100g","Sodium_mg_100g","SatFat_g_100g","Calories_kcal_100g","ML_Risk_Percent","ML_Suggestion"]];
 r.predictions.forEach(p=>rows.push([h.date,h.foodName,p.condition??"none",h.sugar,h.sodium,h.satFat,h.calories,p.probability??"",p.suggestion??""]));
 if(!r.predictions.length) rows.push([h.date,h.foodName,"none",h.sugar,h.sodium,h.satFat,h.calories,"","GENERAL DIET"]);
 const csv=rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="LegalLens_Health_Food_Report.csv";a.click();
}