(() => {
  const input=document.getElementById("image"), status=document.getElementById("status"), result=document.getElementById("result");
  if(!input||!result)return;
  input.multiple=false;
  let busy=false;

  input.addEventListener("change",()=>{ if(input.files?.[0]) runScan(input.files[0]); });

  const form=document.getElementById("healthForm"), reportType=document.getElementById("reportType");
  const profile=()=>form?Object.fromEntries(new FormData(form)):{};

  async function runScan(file){
    if(busy)return; busy=true;
    result.classList.add("hidden");
    setStep(2);
    status.textContent="Reading the food label… 0%";
    try{
      if(!window.Tesseract)throw Error("OCR library could not load. Refresh and try again.");
      const o=await Tesseract.recognize(file,"eng",{logger:m=>{
        if(m.status==="recognizing text"&&typeof m.progress==="number")
          status.textContent="Reading label… "+Math.round(m.progress*100)+"%";
      }});
      const ocr=(o.data.text||"").trim(), health=profile();
      status.textContent="Extracted. Checking product data and health signals…";
      const details=extractDetails(ocr), nutrition=parseNutrition(ocr);
      const remote=await enrichFromOpenFoodFacts(ocr,details);
      const merged=mergeRemote(details,nutrition,remote);
      const analysis=analyze(ocr,health,merged);
      const imageData=await fileToDataURL(file);
      const report={
        product:merged.product, details:merged, remoteSource:remote?.source||"OCR only",
        remoteProduct:remote||null, ocr, imageData,
        confidence:Math.round(Number(o.data.confidence||0)),
        healthProfile:health, disease:health.condition||"None / not selected",
        nutrition:merged.nutrition, analysis, reportType:reportType?.value||"food",
        createdAt:new Date().toISOString()
      };
      localStorage.setItem("legalLensScan",JSON.stringify(report));
      render(report);
      setStep(3);
      status.textContent="Analysis complete. Your final PDF report is ready.";
      setTimeout(()=>document.getElementById("pdf")?.focus(),100);
    }catch(e){
      console.error(e); status.textContent="Scan failed: "+e.message; setStep(1);
    }finally{busy=false;}
  }

  async function enrichFromOpenFoodFacts(text,details){
    const barcode=(text.match(/\b(?:EAN|GTIN|UPC)?\s*[:#-]?\s*(\d{8}|\d{12,14})\b/i)||[])[1];
    const name=details.product;
    if(!barcode&&!name)return null;
    try{
      const url=barcode
        ? `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=code,product_name,brands,ingredients_text,nutriments,nutrition_grades,categories,allergens,quantity`
        : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=1`;
      const res=await fetch(url,{headers:{"Accept":"application/json"}});
      if(!res.ok)return null;
      const data=await res.json();
      const p=barcode?(data.status===1?data.product:null):(data.products?.[0]||null);
      if(!p)return null;
      return {source:"Open Food Facts",product_name:p.product_name||name,brands:p.brands||"",ingredients_text:p.ingredients_text||"",nutriments:p.nutriments||{},nutrition_grades:p.nutrition_grades||"",categories:p.categories||"",allergens:p.allergens||"",code:p.code||barcode,quantity:p.quantity||""};
    }catch(_){return null;}
  }

  function extractDetails(text){
    const clean=String(text||"").replace(/\r/g,""), lines=clean.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const first=(patterns)=>{for(const p of patterns){const m=clean.match(p);if(m)return m[1].trim();}return "";};
    const product=lines.find(x=>x.length>=3&&x.length<=90&&!/^(ingredients|nutrition|energy|calories|net quantity|mrp|fssai|batch|best before|expiry|manufactured|marketed|packed by)/i.test(x))||"Scanned food package";
    return {
      product, ingredients:first([/ingredients?\s*[:\-]\s*([\s\S]*?)(?=\n\s*(?:nutrition|contains|allergen|manufactured|marketed|packed|net quantity|mrp|fssai|batch|best before|expiry)\b|$)/i]),
      company:first([/(?:manufactured(?:\s+by)?|packed\s+by|marketed\s+by|brand owner|manufactured for)\s*[:\-]?\s*([^\n]+)/i]),
      brand:first([/brand\s*[:\-]\s*([^\n]+)/i]),
      quantity:first([/(?:net\s*(?:quantity|wt|weight)|quantity)\s*[:\-]?\s*([^\n]+)/i,/\b(\d+(?:\.\d+)?\s*(?:kg|g|mg|l|ml))\b/i]),
      mrp:first([/(?:mrp|maximum retail price)\s*[:\-]?\s*(?:rs\.?|₹)?\s*([^\n]+)/i]),
      fssai:first([/fssai\s*(?:lic(?:ence|ense)|no\.?|number)?\s*[:\-]?\s*([0-9]{10,14})/i]),
      batch:first([/(?:batch|lot)\s*(?:no\.?|number)?\s*[:\-]?\s*([^\n]+)/i]),
      expiry:first([/(?:best before|expiry|use by)\s*[:\-]?\s*([^\n]+)/i]),
      packageType:/pouch|sachet/i.test(clean)?"Pouch / sachet":/bottle/i.test(clean)?"Bottle":/jar/i.test(clean)?"Jar":/box|carton/i.test(clean)?"Box / carton":/can|tin/i.test(clean)?"Can / tin":/packet|pack/i.test(clean)?"Packet":"Not explicitly stated",
      material:/polyethylene|polypropylene|plastic|pet\b|hdpe|ldpe/i.test(clean)?"Plastic (label text detected)":/glass/i.test(clean)?"Glass (label text detected)":/paper|cardboard/i.test(clean)?"Paper/cardboard (label text detected)":/aluminium|aluminum|metal/i.test(clean)?"Metal/aluminium (label text detected)":"Not stated",
      lines
    };
  }

  function parseNutrition(t){
    const g=p=>{const m=String(t).match(p);return m?Number(m[1]):null;};
    return {energy:g(/energy[^\d]*(\d+(?:\.\d+)?)\s*kcal/i),calories:g(/calories?[^\d]*(\d+(?:\.\d+)?)/i),fat:g(/total\s*fat[^\d]*(\d+(?:\.\d+)?)\s*g/i),saturatedFat:g(/saturated\s*fat[^\d]*(\d+(?:\.\d+)?)\s*g/i),carbs:g(/carbohydrate[^\d]*(\d+(?:\.\d+)?)\s*g/i),sugars:g(/sugars?[^\d]*(\d+(?:\.\d+)?)\s*g/i),protein:g(/protein[^\d]*(\d+(?:\.\d+)?)\s*g/i),sodium:g(/sodium[^\d]*(\d+(?:\.\d+)?)\s*mg/i),salt:g(/salt[^\d]*(\d+(?:\.\d+)?)\s*g/i),fiber:g(/(?:dietary\s*)?fiber[^\d]*(\d+(?:\.\d+)?)\s*g/i),transFat:g(/trans\s*fat[^\d]*(\d+(?:\.\d+)?)\s*g/i),cholesterol:g(/cholesterol[^\d]*(\d+(?:\.\d+)?)\s*mg/i),potassium:g(/potassium[^\d]*(\d+(?:\.\d+)?)\s*mg/i),phosphorus:g(/phosphorus[^\d]*(\d+(?:\.\d+)?)\s*mg/i),calcium:g(/calcium[^\d]*(\d+(?:\.\d+)?)\s*mg/i),iron:g(/iron[^\d]*(\d+(?:\.\d+)?)\s*mg/i)};
  }

  function mergeRemote(d,n,r){
    if(!r)return {...d,nutrition:n};
    const rn=r.nutriments||{}, out={...n};
    const map={energy:"energy-kcal_100g",fat:"fat_100g",saturatedFat:"saturated-fat_100g",carbs:"carbohydrates_100g",sugars:"sugars_100g",protein:"proteins_100g",sodium:"sodium_100g",fiber:"fiber_100g",salt:"salt_100g",transFat:"trans-fat_100g"};
    Object.entries(map).forEach(([k,key])=>{if(out[k]==null&&rn[key]!=null)out[k]=Number(rn[key]);});
    return {...d,product:r.product_name||d.product,brand:d.brand||r.brands||"Not clearly read",ingredients:d.ingredients||r.ingredients_text||"Not clearly read",quantity:d.quantity||r.quantity||"Not clearly read",nutrition:out};
  }

  function analyze(text,p,d){
    const t=String(text+" "+(d.ingredients||"")).toLowerCase(), n=d.nutrition||{}, warnings=[];
    const has=(re)=>re.test(t);
    const sugarHigh=(n.sugars!=null&&n.sugars>10)||has(/sugar|glucose|sucrose|maltose|fructose/);
    const sodiumHigh=(n.sodium!=null&&n.sodium>400)||has(/sodium|salt/);
    const gluten=has(/wheat|barley|rye|malt|gluten/);
    const kidneySignal=has(/sodium|potassium|phosphorus/);
    const allergy=String(p.allergy||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean).filter(x=>t.includes(x));
    if((p.condition==="diabetes"||p.condition==="sugar"||p.sugar_limit==="yes")&&sugarHigh)warnings.push("Sugar signal detected: this product may not fit your selected low-sugar/diabetes screening preference.");
    if((p.condition==="hypertension"||p.low_sodium==="yes")&&sodiumHigh)warnings.push("Sodium/salt signal detected: this product may not fit your selected low-sodium screening preference.");
    if(p.condition==="celiac"&&gluten)warnings.push("Gluten-related ingredient signal detected: review the label carefully before eating.");
    if(p.condition==="kidney"&&kidneySignal)warnings.push("Sodium, potassium or phosphorus signal detected: kidney diets are individualized, so check the exact nutrition values with your clinician/dietitian.");
    if(allergy.length)warnings.push("Possible allergy match: "+allergy.join(", ")+". Do not rely on OCR alone; verify the package allergen statement.");
    if(!warnings.length)warnings.push("No selected health-profile warning was triggered by the readable label data.");
    return {warnings,allergens:["milk","wheat","soy","peanut","nuts","almond","sesame","egg","fish","shellfish","gluten"].filter(x=>new RegExp("\\b"+x+"\\b","i").test(t)),additives:["preservative","emulsifier","stabilizer","artificial flavour","artificial flavor","colour","color","sweetener"].filter(x=>t.includes(x)),summary:warnings.length===1&&warnings[0].startsWith("No selected")?"No selected health-profile warning was triggered.":"One or more personalized checks need attention.",disclaimer:"Screening support only. This does not diagnose disease or replace advice from a qualified clinician."};
  }

  function render(r){
    const a=r.analysis,n=r.nutrition||{},d=r.details;
    result.classList.remove("hidden");
    result.innerHTML=`
      <div class="product-card"><div class="product-image"><img src="${r.imageData}" alt="Actual scanned food package"></div><div><p class="muted">PRODUCT DETECTED</p><h2 class="product-name"></h2><p class="product-brand">OCR confidence: ${r.confidence}% · Data: ${esc(r.remoteSource)}</p></div></div>
      <h2 class="section-title">Step 2 — Product & label details</h2>
      <div class="resultGrid">${metric("Brand",d.brand)}${metric("Company / manufacturer",d.company)}${metric("Net quantity",d.quantity)}${metric("MRP",d.mrp)}${metric("FSSAI",d.fssai)}${metric("Batch / lot",d.batch)}${metric("Best before / expiry",d.expiry)}${metric("Package",d.packageType)}${metric("Material",d.material)}</div>
      <h3>Ingredients</h3><pre>${esc(d.ingredients||"Not clearly read")}</pre>
      <h2 class="section-title">Nutrition detected</h2><div class="resultGrid">${metric("Energy",n.energy,"kcal")}${metric("Fat",n.fat,"g")}${metric("Saturated fat",n.saturatedFat,"g")}${metric("Carbohydrates",n.carbs,"g")}${metric("Sugars",n.sugars,"g")}${metric("Protein",n.protein,"g")}${metric("Sodium",n.sodium,"mg")}${metric("Salt",n.salt,"g")}${metric("Fiber",n.fiber,"g")}${metric("Potassium",n.potassium,"mg")}${metric("Phosphorus",n.phosphorus,"mg")}</div>
      <h2 class="section-title">Personalized health analysis</h2>
      <div class="${a.warnings.some(x=>!x.startsWith("No selected"))?"warning":"good"}"><h3>${a.warnings.some(x=>!x.startsWith("No selected"))?"⚠️ Attention":"✓ No selected warning"}</h3><ul>${a.warnings.map(x=>"<li>"+esc(x)+"</li>").join("")}</ul></div>
      <h3>Allergens</h3><div class="chips">${a.allergens.map(x=>"<span class=\"chip\">"+esc(x)+"</span>").join("")||'<span class="muted">None detected</span>'}</div>
      <h3>Additives</h3><div class="chips">${a.additives.map(x=>"<span class=\"chip\">"+esc(x)+"</span>").join("")||'<span class="muted">None detected</span>'}</div>
      <h2 class="section-title">Government / label verification signal</h2>
      <p class="muted">FSSAI: ${esc(d.fssai||"Not read")} · Legal Metrology declaration signals are informational only, not proof of genuineness or government certification.</p>
      <h3>All readable package text</h3><pre>${esc(d.lines.join("\n"))}</pre>
      <div class="action-row"><button class="report" id="pdf">⬇ Download complete PDF report</button><button class="report secondary-report" id="print">🖨 Print report</button></div>
      <p class="disclaimer">${esc(a.disclaimer)}</p>`;
    result.querySelector(".product-name").textContent=r.product;
    result.querySelector("#pdf").onclick=()=>makePDF(r);
    result.querySelector("#print").onclick=()=>window.print();
    result.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function metric(k,v,u=""){return '<div class="metric"><span>'+esc(k)+'</span><b>'+esc(v==null||v===""?"—":String(v)+(u?" "+u:""))+'</b></div>';}
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  function fileToDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}
  function setStep(active){document.querySelectorAll(".scan-step").forEach((x,i)=>x.classList.toggle("active",i<active));}
  function makePDF(r){
    if(!window.jspdf?.jsPDF){alert("PDF library is still loading. Please try again.");return;}
    const doc=new window.jspdf.jsPDF(), a=r.analysis,d=r.details,n=r.nutrition||{};let y=15;
    const line=(txt,size=10)=>{doc.setFontSize(size);const parts=doc.splitTextToSize(String(txt),178);parts.forEach(p=>{if(y>282){doc.addPage();y=15;}doc.text(p,15,y);y+=5;});};
    doc.setFontSize(18);doc.text("LegalLens — Complete Food Report",15,y);y+=8;
    if(r.imageData){try{doc.addImage(r.imageData,"JPEG",145,10,50,50);}catch(_){}}
    line("Product: "+r.product);line("OCR confidence: "+r.confidence+"%");line("Data source: "+r.remoteSource);y+=3;
    line("PRODUCT & LABEL DETAILS",12);[["Brand",d.brand],["Company / manufacturer",d.company],["Net quantity",d.quantity],["MRP",d.mrp],["FSSAI",d.fssai],["Batch / lot",d.batch],["Best before / expiry",d.expiry],["Package",d.packageType],["Material",d.material]].forEach(x=>line(x[0]+": "+(x[1]||"Not read")));y+=2;
    line("INGREDIENTS",12);line(d.ingredients||"Not clearly read");y+=2;
    line("NUTRITION",12);Object.entries(n).forEach(([k,v])=>{if(v!=null)line(k+": "+v);});y+=2;
    line("PERSONALIZED HEALTH ANALYSIS",12);a.warnings.forEach(w=>line("• "+w));y+=2;
    line("ALLERGENS: "+(a.allergens.join(", ")||"None detected"));line("ADDITIVES: "+(a.additives.join(", ")||"None detected"));y+=2;
    line("ALL READABLE PACKAGE TEXT",12);line(d.lines.join("\n")||"No readable text detected.");y+=2;line(a.disclaimer);
    doc.save("LegalLens-Complete-Food-Report.pdf");
  }
})();