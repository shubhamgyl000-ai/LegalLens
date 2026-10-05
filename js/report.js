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

