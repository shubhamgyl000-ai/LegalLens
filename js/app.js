(() => {
  const input = document.getElementById("image");
  const btn = document.getElementById("scanBtn");
  const status = document.getElementById("status");
  const result = document.getElementById("result");
  const disease = document.getElementById("disease");

  if (!input || !btn) return;

  let lastReport = null;

  input.addEventListener("change", () => {
    btn.disabled = !input.files?.length;
    status.textContent = input.files?.length ? "Photo ready. Tap scan." : "";
  });

  btn.addEventListener("click", async () => {
    const file = input.files?.[0];
    if (!file) return;

    btn.disabled = true;
    result.classList.add("hidden");
    status.textContent = "Preparing the photo…";

    try {
      if (!window.Tesseract) {
        throw new Error("OCR library could not load. Check your internet connection and refresh.");
      }

      status.textContent = "Reading the food label with OCR…";
      const ocr = await Tesseract.recognize(file, "eng", {
        logger: m => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            status.textContent = "Reading label… " + Math.round(m.progress * 100) + "%";
          }
        }
      });

      const text = (ocr.data.text || "").trim();
      const confidence = Math.round(ocr.data.confidence || 0);
      const analysis = await analyzeFood(text, disease.value);

      lastReport = {
        product: extractProduct(text),
        ocr: text,
        confidence,
        disease: disease.value || "None",
        analysis,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem("legalLensScan", JSON.stringify(lastReport));
      render(lastReport);
      status.textContent = "Done — your food details are ready.";
    } catch (error) {
      console.error(error);
      status.textContent = "Scan failed: " + error.message;
    } finally {
      btn.disabled = false;
    }
  });

  async function analyzeFood(text, selectedDisease) {
    let model = {
      intercept: -2.2,
      features: { sugar: 1.25, sodium: 1.05, gluten: 1.35, potassium: 0.85, phosphorus: 0.85, ultra_processed: 0.35 }
    };

    try {
      const r = await fetch("ml-model.json", { cache: "no-store" });
      if (r.ok) model = await r.json();
    } catch (_) {}

    const t = text.toLowerCase();
    const rules = {
      diabetes: ["sugar", "glucose", "sucrose", "maltose", "fructose", "added sugar"],
      hypertension: ["sodium", "salt"],
      kidney: ["sodium", "phosphorus", "potassium"],
      celiac: ["wheat", "barley", "rye", "malt", "gluten"],
      sugar: ["sugar", "glucose", "sucrose", "added sugar"]
    };

    const flags = [];
    Object.entries(rules).forEach(([risk, terms]) => {
      terms.forEach(term => {
        if (t.includes(term)) flags.push({ ingredient: term, risk });
      });
    });

    const unique = [...new Map(flags.map(x => [x.ingredient + "-" + x.risk, x])).values()];

    const features = {
      sugar: /sugar|glucose|sucrose|maltose|fructose|added sugar/.test(t) ? 1 : 0,
      sodium: /sodium|salt/.test(t) ? 1 : 0,
      gluten: /wheat|barley|rye|malt|gluten/.test(t) ? 1 : 0,
      potassium: /potassium/.test(t) ? 1 : 0,
      phosphorus: /phosphorus/.test(t) ? 1 : 0,
      ultra_processed: /flavour|flavor|preservative|emulsifier|colour|color|sweetener/.test(t) ? 1 : 0
    };

    let z = Number(model.intercept || 0);
    Object.entries(features).forEach(([key, value]) => {
      z += Number(model.features?.[key] || 0) * value;
    });

    let probability = Math.round((1 / (1 + Math.exp(-z))) * 100);

    if (selectedDisease === "diabetes" && features.sugar) probability += 20;
    if (selectedDisease === "hypertension" && features.sodium) probability += 20;
    if (selectedDisease === "celiac" && features.gluten) probability += 30;
    if (selectedDisease === "kidney") probability += (features.sodium + features.potassium + features.phosphorus) * 15;
    probability = Math.min(100, probability);

    const decision = probability >= 70 ? "Avoid for now" : probability >= 40 ? "Use caution" : "Generally okay";
    const relevant = selectedDisease ? unique.filter(x => x.risk === selectedDisease) : unique;

    return {
      decision,
      riskScore: probability,
      mlProbability: probability,
      flags: relevant,
      allFlags: unique,
      features,
      nutrition: extractNutrition(text),
      allergens: extractAllergens(text),
      additives: extractAdditives(text),
      summary: probability >= 70
        ? "The screening model found signals that deserve extra caution for the selected health condition."
        : probability >= 40
          ? "The label contains some signals worth checking before eating."
          : "No strong warning signal was detected by this prototype screening model.",
      disclaimer: "Prototype screening only. It is not a diagnosis, medical prescription, or legal verdict."
    };
  }

  function extractProduct(text) {
    const lines = text.split(/\n+/).map(x => x.trim()).filter(Boolean);
    const candidate = lines.find(x => x.length >= 3 && x.length <= 70 && !/^(ingredients|nutrition|energy|calories|net quantity|mrp|fssai)/i.test(x));
    return candidate || "Scanned food package";
  }

  function extractNutrition(text) {
    const get = (patterns) => {
      for (const p of patterns) {
        const m = text.match(p);
        if (m) return Number(m[1]);
      }
      return null;
    };
    return {
      energy: get([/energy[^\d]*(\d+(?:\.\d+)?)\s*kcal/i]),
      calories: get([/calories?[^\d]*(\d+(?:\.\d+)?)/i]),
      fat: get([/total\s*fat[^\d]*(\d+(?:\.\d+)?)\s*g/i]),
      saturatedFat: get([/saturated\s*fat[^\d]*(\d+(?:\.\d+)?)\s*g/i]),
      carbs: get([/carbohydrate[^\d]*(\d+(?:\.\d+)?)\s*g/i]),
      sugars: get([/sugars?[^\d]*(\d+(?:\.\d+)?)\s*g/i]),
      protein: get([/protein[^\d]*(\d+(?:\.\d+)?)\s*g/i]),
      sodium: get([/sodium[^\d]*(\d+(?:\.\d+)?)\s*mg/i]),
      salt: get([/salt[^\d]*(\d+(?:\.\d+)?)\s*g/i])
    };
  }

  function extractAllergens(text) {
    const known = ["milk", "wheat", "soy", "peanut", "nuts", "almond", "sesame", "egg", "fish", "shellfish", "gluten"];
    return known.filter(x => new RegExp("\\b" + x + "\\b", "i").test(text));
  }

  function extractAdditives(text) {
    const terms = ["preservative", "emulsifier", "stabilizer", "artificial flavour", "artificial flavor", "colour", "color", "sweetener"];
    return terms.filter(x => text.toLowerCase().includes(x));
  }

  function render(report) {
    const a = report.analysis;
    const n = a.nutrition;

    result.classList.remove("hidden");
    result.innerHTML = `
      <div class="product-card">
        <div class="product-image">🥫</div>
        <div>
          <p class="muted">PRODUCT DETECTED</p>
          <h2 class="product-name"></h2>
          <p class="product-brand">OCR confidence: ${report.confidence}%</p>
        </div>
      </div>

      <h2 class="section-title">Food overview</h2>
      <div class="resultGrid">
        <div class="metric"><span>LegalLens score</span><b>${a.riskScore}/100</b></div>
        <div class="metric"><span>Personal check</span><b>${escapeHtml(a.decision)}</b></div>
        <div class="metric"><span>Condition</span><b>${escapeHtml(report.disease)}</b></div>
        <div class="metric"><span>OCR confidence</span><b>${report.confidence}%</b></div>
      </div>

      <div class="${a.riskScore >= 70 ? "danger" : a.riskScore >= 40 ? "warning" : "good"}">
        <h3>In simple words</h3>
        <p>${escapeHtml(a.summary)}</p>
      </div>

      <h2 class="section-title">Nutrition detected</h2>
      <div class="resultGrid">
        ${nutritionMetric("Energy", n.energy, "kcal")}
        ${nutritionMetric("Calories", n.calories, "kcal")}
        ${nutritionMetric("Fat", n.fat, "g")}
        ${nutritionMetric("Saturated fat", n.saturatedFat, "g")}
        ${nutritionMetric("Carbohydrates", n.carbs, "g")}
        ${nutritionMetric("Sugars", n.sugars, "g")}
        ${nutritionMetric("Protein", n.protein, "g")}
        ${nutritionMetric("Sodium", n.sodium, "mg")}
      </div>

      <h2 class="section-title">Ingredients & warnings</h2>
      <div class="chips">
        ${(a.allFlags.length ? a.allFlags : []).map(x => `<span class="chip">${escapeHtml(x.ingredient)}</span>`).join("") || "<span class='muted'>No matching warning terms detected.</span>"}
      </div>

      <h2 class="section-title">Allergens detected</h2>
      <div class="chips">
        ${a.allergens.map(x => `<span class="chip">${escapeHtml(x)}</span>`).join("") || "<span class='muted'>No common allergen keyword detected.</span>"}
      </div>

      <h2 class="section-title">Additives / processing signals</h2>
      <div class="chips">
        ${a.additives.map(x => `<span class="chip">${escapeHtml(x)}</span>`).join("") || "<span class='muted'>No common additive keyword detected.</span>"}
      </div>

      <details class="ocr-details">
        <summary>Show extracted label text</summary>
        <pre></pre>
      </details>

      <div class="action-row">
        <button class="report" id="pdf">Download PDF report</button>
        <button class="report secondary-report" id="csv">Download CSV</button>
      </div>

      <p class="disclaimer">${escapeHtml(a.disclaimer)}</p>
    `;

    result.querySelector(".product-name").textContent = report.product;
    result.querySelector("pre").textContent = report.ocr || "No text detected.";

    result.querySelector("#pdf").onclick = () => downloadPDF(report);
    result.querySelector("#csv").onclick = () => downloadCSV(report);
  }

  function nutritionMetric(label, value, unit) {
    return `<div class="metric"><span>${label}</span><b>${value == null ? "—" : value + " " + unit}</b></div>`;
  }

  function downloadCSV(report) {
    const a = report.analysis;
    const n = a.nutrition;
    const rows = [
      ["Field", "Value"],
      ["Product", report.product],
      ["OCR confidence", report.confidence + "%"],
      ["Condition", report.disease],
      ["LegalLens score", a.riskScore + "/100"],
      ["Decision", a.decision],
      ["Energy", n.energy ?? ""],
      ["Calories", n.calories ?? ""],
      ["Fat", n.fat ?? ""],
      ["Saturated fat", n.saturatedFat ?? ""],
      ["Carbohydrates", n.carbs ?? ""],
      ["Sugars", n.sugars ?? ""],
      ["Protein", n.protein ?? ""],
      ["Sodium", n.sodium ?? ""],
      ["Allergens", a.allergens.join("; ")],
      ["Additives", a.additives.join("; ")]
    ];
    rows.push(["OCR text", report.ocr.replace(/\n/g, " ")]);
    const csv = rows.map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    triggerDownload(URL.createObjectURL(blob), "LegalLens-Food-Report.csv");
  }

  async function downloadPDF(report) {
    if (!window.jspdf?.jsPDF) {
      alert("PDF library is still loading. Please try again.");
      return;
    }
    const doc = new jspdf.jsPDF();
    const a = report.analysis;
    const n = a.nutrition;
    let y = 18;

    doc.setFontSize(22);
    doc.text("LegalLens", 15, y); y += 10;
    doc.setFontSize(15);
    doc.text("Food Details & Health Screening Report", 15, y); y += 10;
    doc.setFontSize(10);
    const lines = [
      "Product: " + report.product,
      "OCR confidence: " + report.confidence + "%",
      "Selected condition: " + report.disease,
      "LegalLens score: " + a.riskScore + "/100",
      "Decision: " + a.decision,
      "",
      "Nutrition:",
      "Energy: " + (n.energy ?? "—") + " kcal",
      "Calories: " + (n.calories ?? "—") + " kcal",
      "Fat: " + (n.fat ?? "—") + " g",
      "Saturated fat: " + (n.saturatedFat ?? "—") + " g",
      "Carbohydrates: " + (n.carbs ?? "—") + " g",
      "Sugars: " + (n.sugars ?? "—") + " g",
      "Protein: " + (n.protein ?? "—") + " g",
      "Sodium: " + (n.sodium ?? "—") + " mg",
      "",
      "Warnings: " + (a.allFlags.map(x => x.ingredient).join(", ") || "None detected"),
      "Allergens: " + (a.allergens.join(", ") || "None detected"),
      "Additives: " + (a.additives.join(", ") || "None detected"),
      "",
      "Summary: " + a.summary,
      "",
      "Extracted label text:",
      report.ocr || "No OCR text detected.",
      "",
      a.disclaimer
    ];

    const wrapped = doc.splitTextToSize(lines.join("\n"), 178);
    wrapped.forEach(line => {
      if (y > 280) { doc.addPage(); y = 18; }
      doc.text(line, 15, y);
      y += 5;
    });
    doc.save("LegalLens-Food-Health-Report.pdf");
  }

  function triggerDownload(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }
})();