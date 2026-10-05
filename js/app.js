(() => {
  const input = document.getElementById("image");
  const btn = document.getElementById("scanBtn");
  const status = document.getElementById("status");
  const result = document.getElementById("result");
  if (!input || !btn || !result) return;

  let lastReport = null;
  input.multiple = false;
  input.addEventListener("change", () => {
    btn.disabled = !input.files?.length;
    status.textContent = input.files?.length ? "Photo ready. Tap scan." : "";
  });

  const healthForm = document.getElementById("healthForm");
  function getHealthProfile() {
    if (!healthForm) return {};
    const data = Object.fromEntries(new FormData(healthForm));
    localStorage.setItem("legalLensHealthProfile", JSON.stringify(data));
    return data;
  }
  if (healthForm) healthForm.querySelectorAll("input,select").forEach(el => el.addEventListener("change", getHealthProfile));

  btn.addEventListener("click", async () => {
    const file = input.files?.[0];
    if (!file) return;
    btn.disabled = true;
    result.classList.add("hidden");
    status.textContent = "Reading the food label…";
    try {
      if (!window.Tesseract) throw new Error("OCR library could not load. Refresh and try again.");
      const ocr = await Tesseract.recognize(file, "eng", { logger: m => {
        if (m.status === "recognizing text" && typeof m.progress === "number") status.textContent = "Reading label… " + Math.round(m.progress * 100) + "%";
      }});
      const text = (ocr.data.text || "").trim();
      const confidence = Math.round(Number(ocr.data.confidence || 0));
      const profile = getHealthProfile();
      const analysis = analyzeFood(text, profile.condition || "", profile);
      lastReport = { product: extractProduct(text), ocr: text, confidence, imageCount: 1, imageNames: [file.name], disease: profile.condition || "None", healthProfile: profile, analysis, createdAt: new Date().toISOString() };
      localStorage.setItem("legalLensScan", JSON.stringify(lastReport));
      render(lastReport, file);
      status.textContent = "Done — your product report is ready."; 
    } catch (e) {
      console.error(e);
      status.textContent = "Scan failed: " + e.message;
    } finally { btn.disabled = false; }
  });

  function analyzeFood(text, condition, profile) {
    const t = text.toLowerCase();
    const nutrition = extractNutrition(text);
    const rules = { diabetes:["sugar","glucose","sucrose","maltose","fructose"], hypertension:["sodium","salt"], kidney:["sodium","potassium","phosphorus"], celiac:["wheat","barley","rye","malt","gluten"], sugar:["sugar","glucose","sucrose","maltose","fructose"] };
    const flags = [];
    Object.entries(rules).forEach(([risk, terms]) => terms.forEach(term => { if (t.includes(term)) flags.push({ingredient:term,risk}); }));
    const features = { sugar:/sugar|glucose|sucrose|maltose|fructose/.test(t), sodium:/sodium|salt/.test(t), gluten:/wheat|barley|rye|malt|gluten/.test(t), potassium:/potassium/.test(t), phosphorus:/phosphorus/.test(t), ultra_processed:/flavour|flavor|preservative|emulsifier|colour|color|sweetener/.test(t) };
    let score = 10;
    if (features.sugar) score += 20;
    if (features.sodium) score += 15;
    if (features.gluten) score += 10;
    if (features.ultra_processed) score += 10;
    if (condition === "diabetes" && features.sugar) score += 25;
    if (condition === "hypertension" && features.sodium) score += 25;
    if (condition === "celiac" && features.gluten) score += 35;
    if (condition === "kidney" && (features.sodium || features.potassium || features.phosphorus)) score += 25;
    if ((profile.sugar_limit === "yes") && (features.sugar || (nutrition.sugars != null && nutrition.sugars > 10))) score += 20;
    if ((profile.low_sodium === "yes") && (features.sodium || (nutrition.sodium != null && nutrition.sodium > 400))) score += 20;
    const allergy = String(profile.allergy || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
    if (allergy.some(x => t.includes(x))) score += 35;
    score = Math.min(100, score);
    const decision = score >= 70 ? "Avoid for now" : score >= 40 ? "Use caution" : "No specific concern detected";
    return { riskScore:score, decision, flags, allFlags:flags, features, nutrition, allergens:extractAllergens(text), additives:extractAdditives(text), summary:score >= 70 ? "Several label signals deserve extra caution." : score >= 40 ? "Some label signals are worth checking before eating." : "No strong warning signal was detected by this prototype.", personalReason: allergy.some(x => t.includes(x)) ? "A possible allergy keyword match was found." : "No selected health preference created an additional warning.", disclaimer:"Screening support only. This does not diagnose disease or replace advice from a qualified clinician." };
  }

  function extractProduct(text) {
    const lines = text.split(/\n+/).map(x => x.trim()).filter(Boolean);
    return lines.find(x => x.length >= 3 && x.length <= 90 && !/^(ingredients|nutrition|energy|calories|net quantity|mrp|fssai|batch|best before|expiry)/i.test(x)) || "Scanned food package";
  }
  function extractNutrition(text) {
    const get = p => { const m = text.match(p); return m ? Number(m[1]) : null; };
    return { energy:get(/energy[^\d]*(\d+(?:\.\d+)?)\s*kcal/i), calories:get(/calories?[^\d]*(\d+(?:\.\d+)?)/i), fat:get(/total\s*fat[^\d]*(\d+(?:\.\d+)?)\s*g/i), saturatedFat:get(/saturated\s*fat[^\d]*(\d+(?:\.\d+)?)\s*g/i), carbs:get(/carbohydrate[^\d]*(\d+(?:\.\d+)?)\s*g/i), sugars:get(/sugars?[^\d]*(\d+(?:\.\d+)?)\s*g/i), protein:get(/protein[^\d]*(\d+(?:\.\d+)?)\s*g/i), sodium:get(/sodium[^\d]*(\d+(?:\.\d+)?)\s*mg/i), salt:get(/salt[^\d]*(\d+(?:\.\d+)?)\s*g/i), fiber:get(/(?:dietary\s*)?fiber[^\d]*(\d+(?:\.\d+)?)\s*g/i), transFat:get(/trans\s*fat[^\d]*(\d+(?:\.\d+)?)\s*g/i), cholesterol:get(/cholesterol[^\d]*(\d+(?:\.\d+)?)\s*mg/i), potassium:get(/potassium[^\d]*(\d+(?:\.\d+)?)\s*mg/i), phosphorus:get(/phosphorus[^\d]*(\d+(?:\.\d+)?)\s*mg/i), calcium:get(/calcium[^\d]*(\d+(?:\.\d+)?)\s*mg/i), iron:get(/iron[^\d]*(\d+(?:\.\d+)?)\s*mg/i) };
  }
  function extractAllergens(text) { return ["milk","wheat","soy","peanut","nuts","almond","sesame","egg","fish","shellfish","gluten"].filter(x => new RegExp("\\b" + x + "\\b","i").test(text)); }
  function extractAdditives(text) { return ["preservative","emulsifier","stabilizer","artificial flavour","artificial flavor","colour","color","sweetener"].filter(x => text.toLowerCase().includes(x)); }
  function render(report, file) {
    const a=report.analysis, n=a.nutrition;
    result.classList.remove("hidden");
    result.innerHTML = `<div class="product-card"><div class="product-image" id="overviewImages"></div><div><p class="muted">PRODUCT DETECTED</p><h2 class="product-name"></h2><p class="product-brand">OCR confidence: ${report.confidence}%</p></div></div><h2 class="section-title">Product report</h2><div class="resultGrid"><div class="metric"><span>LegalLens score</span><b>${a.riskScore}/100</b></div><div class="metric"><span>Screening</span><b>${escapeHtml(a.decision)}</b></div><div class="metric"><span>Condition</span><b>${escapeHtml(report.disease)}</b></div><div class="metric"><span>OCR confidence</span><b>${report.confidence}%</b></div></div><div class="${a.riskScore>=70?"danger":a.riskScore>=40?"warning":"good"}"><h3>In simple words</h3><p>${escapeHtml(a.summary)}</p><p>${escapeHtml(a.personalReason)}</p></div><h2 class="section-title">Nutrition detected</h2><div class="resultGrid">${nutritionMetric("Energy",n.energy,"kcal")}${nutritionMetric("Calories",n.calories,"kcal")}${nutritionMetric("Fat",n.fat,"g")}${nutritionMetric("Saturated fat",n.saturatedFat,"g")}${nutritionMetric("Carbohydrates",n.carbs,"g")}${nutritionMetric("Sugars",n.sugars,"g")}${nutritionMetric("Protein",n.protein,"g")}${nutritionMetric("Sodium",n.sodium,"mg")}${nutritionMetric("Salt",n.salt,"g")}${nutritionMetric("Fiber",n.fiber,"g")}${nutritionMetric("Trans fat",n.transFat,"g")}${nutritionMetric("Cholesterol",n.cholesterol,"mg")}${nutritionMetric("Potassium",n.potassium,"mg")}${nutritionMetric("Phosphorus",n.phosphorus,"mg")}${nutritionMetric("Calcium",n.calcium,"mg")}${nutritionMetric("Iron",n.iron,"mg")}</div><h2 class="section-title">Ingredients & warnings</h2><div class="chips">${a.allFlags.map(x=>`<span class="chip">${escapeHtml(x.ingredient)}</span>`).join("")||"<span class=muted>No warning keywords detected.</span>"}</div><h2 class="section-title">Allergens</h2><div class="chips">${a.allergens.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join("")||"<span class=muted>None detected.</span>"}</div><h2 class="section-title">Additives</h2><div class="chips">${a.additives.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join("")||"<span class=muted>None detected.</span>"}</div><details class="ocr-details"><summary>Show extracted label text</summary><pre></pre></details><div class="action-row"><button class="report" id="pdf">Download PDF report</button><button class="report secondary-report" id="csv">Download CSV</button></div><p class="disclaimer">${escapeHtml(a.disclaimer)}</p>`;
    result.querySelector(".product-name").textContent=report.product;
    const img=result.querySelector("#overviewImages"); if(img){ const el=document.createElement("img"); el.src=URL.createObjectURL(file); el.alt="Scanned food package"; img.appendChild(el); }
    result.querySelector("pre").textContent=report.ocr || "No readable text detected.";
    result.querySelector("#pdf").onclick=()=>downloadPDF(report);
    result.querySelector("#csv").onclick=()=>downloadCSV(report);
  }
  function nutritionMetric(label,value,unit){ return `<div class="metric"><span>${label}</span><b>${value==null?"—":value+" "+unit}</b></div>`; }
  function downloadCSV(r){ const a=r.analysis,n=a.nutrition; const rows=[["Field","Value"],["Product",r.product],["OCR confidence",r.confidence+"%"],["Condition",r.disease],["Score",a.riskScore+"/100"],["Decision",a.decision],...Object.entries(n).map(([k,v])=>[k,v??""]),["Allergens",a.allergens.join("; ")],["Additives",a.additives.join("; ")],["OCR text",r.ocr]]; const csv=rows.map(row=>row.map(v=>""" + String(v).replace(/"/g,"""") + """).join(",")).join("\n"); triggerDownload(URL.createObjectURL(new Blob([csv],{type:"text/csv"})),"LegalLens-Product-Report.csv"); }
  function downloadPDF(r){ if(!window.jspdf?.jsPDF){alert("PDF library is still loading. Try again.");return;} const a=r.analysis,n=a.nutrition,doc=new jspdf.jsPDF(); let y=18; const lines=["LegalLens — Product Report","Product: "+r.product,"OCR confidence: "+r.confidence+"%","Condition: "+r.disease,"Score: "+a.riskScore+"/100","Screening: "+a.decision,"","Nutrition:"]; Object.entries(n).forEach(([k,v])=>lines.push(k+": "+(v==null?"—":v))); lines.push("","Allergens: "+(a.allergens.join(", ")||"None detected"),"Additives: "+(a.additives.join(", ")||"None detected"),"","Summary: "+a.summary,"","Extracted label text:",r.ocr||"No text detected.","",a.disclaimer); doc.setFontSize(16); doc.text("LegalLens — Product Report",15,y); y+=9; doc.setFontSize(10); doc.splitTextToSize(lines.slice(1).join("\n"),178).forEach(line=>{if(y>280){doc.addPage();y=18;}doc.text(line,15,y);y+=5;}); doc.save("LegalLens-Product-Report.pdf"); }
  function triggerDownload(url,name){ const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
  function escapeHtml(v){ return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'":"&#039;",""":"&quot;"}[c])); }
})();