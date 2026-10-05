const hasDisease=document.getElementById("hasDisease");
const diseaseSection=document.getElementById("diseaseSection");
hasDisease.addEventListener("change",()=>{
  diseaseSection.style.display=hasDisease.value==="yes"?"block":"none";
});
document.getElementById("healthForm").addEventListener("submit",e=>{
  e.preventDefault();
  const conditions=hasDisease.value==="yes"
    ? [...document.querySelectorAll("#diseaseSection input:checked")].map(x=>x.value)
    : [];
  if(hasDisease.value==="yes" && conditions.length===0){
    alert("Please select at least one diagnosed condition.");
    return;
  }
  const scan=JSON.parse(localStorage.getItem("legalLensReport")||"{}");
  const health={hasDisease:hasDisease.value,conditions,foodName:document.getElementById("foodName").value.trim(),date:new Date().toISOString()};
  localStorage.setItem("legalLensHealth",JSON.stringify(health));
  localStorage.setItem("legalLensFoodReport",JSON.stringify(buildFoodReport(scan,health)));
  window.location.href="report.html";
});
function buildFoodReport(scan,health){
  const name=health.foodName||scan.product||"Scanned food";
  const flags=[];
  const conditions=health.conditions;
  const text=(scan.product||"").toLowerCase();
  if(conditions.includes("diabetes")) flags.push({rule:"Diabetes",status:/sugar|sweet|candy|dessert|cola|soda/.test(text)?"LIMIT/AVOID":"CHECK PORTION & ADDED SUGAR",reason:"People with diabetes generally need to manage carbohydrate and added-sugar intake."});
  if(conditions.includes("hypertension")) flags.push({rule:"High blood pressure",status:"CHECK SODIUM",reason:"Lower-sodium choices are generally preferred for blood-pressure management."});
  if(conditions.includes("heart")) flags.push({rule:"Heart disease",status:"CHECK SATURATED FAT & SODIUM",reason:"Heart-healthy eating commonly emphasizes lower saturated fat and sodium."});
  if(conditions.includes("kidney")) flags.push({rule:"Kidney disease",status:"ASK CLINICIAN",reason:"Protein, sodium, potassium and phosphorus needs can vary substantially with kidney disease."});
  if(conditions.includes("other")) flags.push({rule:"Other condition",status:"ASK CLINICIAN",reason:"The condition is not specific enough for a safe automated food recommendation."});
  if(!conditions.length) flags.push({rule:"No diagnosed condition reported",status:"GENERAL DIET ONLY",reason:"No disease-specific restriction was selected."});
  return {product:name,conditions:conditions.join("; ")||"None reported",flags,disclaimer:"Educational screening only — not medical advice or a diagnosis."};
}