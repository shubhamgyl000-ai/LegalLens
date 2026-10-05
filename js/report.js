const report = JSON.parse(localStorage.getItem("legalLensReport") || "null");

if (!report) {
  window.location.href = "scan.html";
} else {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set("reportProduct", report.product || "Compliance Report");
  set("reportTime", "Generated: " + new Date().toLocaleString());
  set("rProduct", report.product || "-");
  set("rMRP", "₹" + Number(report.mrp || 0).toFixed(2));
  set("rQuantity", (report.quantity ?? "-") + " " + (report.unit || ""));
  set("rManufacturer", report.manufacturer || "-");
  set("expectedUSP", "₹" + Number(report.expectedUSP || 0).toFixed(2));
  set("printedUSPReport", "₹" + Number(report.printedUSP || 0).toFixed(2));

  const status = document.getElementById("overallStatus");
  if (status) {
    status.textContent = report.status || "REVIEW";
    status.classList.toggle("status-pass", report.status === "PASS");
    status.classList.toggle("status-fail", report.status === "FAIL");
  }

  const uspMessage = document.getElementById("uspMessage");
  if (uspMessage) {
    uspMessage.textContent = Number(report.expectedUSP) === Number(report.printedUSP)
      ? "✓ Printed USP matches the calculated value."
      : "⚠ USP difference detected. Human review recommended.";
  }

  const checks = document.getElementById("checks");
  if (checks) {
    checks.innerHTML = "";
    Object.entries(report.checks || {}).forEach(([name, passed]) => {
      const item = document.createElement("div");
      item.className = "check-item";
      const nameEl = document.createElement("span");
      nameEl.textContent = name;
      const valueEl = document.createElement("strong");
      valueEl.className = passed ? "check-pass" : "check-fail";
      valueEl.textContent = passed ? "✓ PASS" : "✕ REVIEW";
      item.append(nameEl, valueEl);
      checks.appendChild(item);
    });
  }
}

const food = JSON.parse(localStorage.getItem("legalLensFoodReport") || "null");
if (food) {
  const card = document.getElementById("foodReportCard");
  const box = document.getElementById("foodReport");

  if (card && box) {
    card.style.display = "block";
    const n = food.nutrition || {};
    box.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = "Nutrition: Sugar " + (n.sugar ?? "—") + " g, Sodium " + (n.sodium ?? "—") +
      " mg, Saturated fat " + (n.satFat ?? "—") + " g, Calories " + (n.calories ?? "—") + " kcal per 100g.";
    box.appendChild(p);

    (food.predictions || []).forEach(item => {
      const row = document.createElement("div");
      row.className = "check-item";
      const left = document.createElement("span");
      left.textContent = item.condition + " — ML confidence " + item.probability + "%";
      const right = document.createElement("strong");
      right.textContent = item.suggestion;
      row.append(left, right);
      box.appendChild(row);
    });

    const note = document.createElement("p");
    note.className = "note";
    note.textContent = food.disclaimer || "";
    box.appendChild(note);
  }
}

function downloadHealthCSV() {
  const h = JSON.parse(localStorage.getItem("legalLensHealth") || "null");
  const r = JSON.parse(localStorage.getItem("legalLensFoodReport") || "null");
  if (!h || !r) return;

  const rows = [
    ["Date","Food","Condition","Sugar_g_100g","Sodium_mg_100g","SatFat_g_100g","Calories_kcal_100g","ML_Risk_Percent","ML_Suggestion"]
  ];

  (r.predictions || []).forEach(p => rows.push([
    h.date, h.foodName, p.condition, h.sugar, h.sodium, h.satFat, h.calories, p.probability, p.suggestion
  ]));

  const csv = rows.map(row => row.map(v => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
  const a = document.createElement("a");
  a.href = url;
  a.download = "LegalLens_Health_Food_Report.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}