const report =
    JSON.parse(localStorage.getItem("legalLensReport"));

if (!report) {

    window.location.href = "scan.html";

} else {

    document.getElementById("reportProduct").textContent =
        report.product;

    document.getElementById("reportTime").textContent =
        "Generated: " + new Date().toLocaleString();

    document.getElementById("rProduct").textContent =
        report.product;

    document.getElementById("rMRP").textContent =
        "₹" + report.mrp.toFixed(2);

    document.getElementById("rQuantity").textContent =
        report.quantity + " " + report.unit;

    document.getElementById("rManufacturer").textContent =
        report.manufacturer;

    document.getElementById("expectedUSP").textContent =
        "₹" + report.expectedUSP.toFixed(2);

    document.getElementById("printedUSPReport").textContent =
        "₹" + report.printedUSP.toFixed(2);

    const status =
        document.getElementById("overallStatus");

    status.textContent = report.status;

    if (report.status === "PASS") {
        status.classList.add("status-pass");
    }

    if (report.status === "FAIL") {
        status.classList.add("status-fail");
    }

    const uspMessage =
        document.getElementById("uspMessage");

    if (report.expectedUSP === report.printedUSP) {

        uspMessage.textContent =
            "✓ Printed USP matches the calculated value.";

    } else {

        uspMessage.textContent =
            "⚠ USP difference detected. Human review recommended.";

    }

    const checks =
        document.getElementById("checks");

    checks.innerHTML = "";

    Object.entries(report.checks).forEach(
        ([name, passed]) => {

            const item =
                document.createElement("div");

            item.className = "check-item";

            item.innerHTML = `
                <span>${name}</span>
                <strong class="${passed
                    ? "check-pass"
                    : "check-fail"}">
                    ${passed ? "✓ PASS" : "✕ REVIEW"}
                </strong>
            `;

            checks.appendChild(item);

        }
    );

}


const food=JSON.parse(localStorage.getItem("legalLensFoodReport")||"null");
if(food){
 const card=document.getElementById("foodReportCard"), box=document.getElementById("foodReport");
 card.style.display="block";
 box.innerHTML="<p><b>Nutrition:</b> Sugar "+food.nutrition.sugar+" g, Sodium "+food.nutrition.sodium+" mg, Saturated fat "+food.nutrition.satFat+" g, Calories "+food.nutrition.calories+" kcal per 100g.</p>";
 (food.predictions||[]).forEach(p=>{box.innerHTML+="<div class='check-item'><span>"+p.condition+" — ML confidence "+p.probability+"%</span><strong>"+p.suggestion+"</strong></div>"});
 box.innerHTML+="<p class='note'>"+food.disclaimer+"</p>";
}
function downloadHealthCSV(){
 const h=JSON.parse(localStorage.getItem("legalLensHealth")||"null"), r=JSON.parse(localStorage.getItem("legalLensFoodReport")||"null");
 if(!h||!r)return;
 const rows=[["Date","Food","Condition","Sugar_g_100g","Sodium_mg_100g","SatFat_g_100g","Calories_kcal_100g","ML_Risk_Percent","ML_Suggestion"]];
 (r.predictions||[]).forEach(p=>rows.push([h.date,h.foodName,p.condition,h.sugar,h.sodium,h.satFat,h.calories,p.probability,p.suggestion]));
 const csv=rows.map(x=>x.map(v=>'"\'+String(v).replaceAll('"','""')+'\"').join(",")).join("\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="LegalLens_Health_Food_Report.csv";a.click();
}