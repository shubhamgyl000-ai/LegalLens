(() => {
  const input = document.getElementById("image");
  const result = document.getElementById("result");
  if (!input || !result) return;

  const CONSUMER_AFFAIRS_SOURCE = "https://consumeraffairs.gov.in/pages/legal-metrology-overview";

  // Department of Consumer Affairs / Legal Metrology reference.
  // The packaged-commodity rules describe declarations such as manufacturer/packer/importer,
  // commodity name, net quantity, manufacture date, MRP, consumer-care details and applicable date declarations.
  function extractVerification(text) {
    const sourceText = String(text || "");
    const fssai = (sourceText.match(/fssai\s*(?:lic(?:ence|ense)|no\.?|number)?\s*[:\-]?\s*([0-9]{10,14})/i) || [])[1] || "";
    const company = (sourceText.match(/(?:manufactured(?:\s+by)?|packed\s+by|marketed\s+by|manufactured\s+for)\s*[:\-]?\s*([^\n]+)/i) || [])[1] || "";
    const mandatory = {
      manufacturerOrPacker: /manufactured|packed\s+by|manufactured\s+by|imported\s+by/i.test(sourceText),
      commodityName: /\b(?:ingredients?|product|food|commodity)\b/i.test(sourceText),
      netQuantity: /net\s*(?:quantity|wt|weight)|\d+(?:\.\d+)?\s*(?:kg|g|mg|l|ml)/i.test(sourceText),
      mrp: /\bmrp\b|maximum\s+retail\s+price/i.test(sourceText),
      manufactureDate: /manufactur(?:ed|ing)\s*(?:date)?|mfg\.?\s*date/i.test(sourceText),
      bestBefore: /best\s*before|expiry|use\s*by/i.test(sourceText),
      consumerCare: /consumer\s*care|customer\s*care|helpline|toll.?free/i.test(sourceText),
      unitSalePrice: /unit\s*sale\s*price|₹\s*\/\s*(?:kg|g|l|ml)/i.test(sourceText)
    };
    const score = Object.values(mandatory).filter(Boolean).length;
    const status = fssai ? "FSSAI number detected — government database verification is still required" : "No readable FSSAI licence/registration number";
    return { fssai, company: company.trim(), mandatory, labelComplianceSignals: score, source: CONSUMER_AFFAIRS_SOURCE, status };
  }

  function renderVerification(report) {
    const old = result.querySelector(".verification-details");
    if (old) old.remove();
    const v = extractVerification(report.ocr || "");
    const section = document.createElement("section");
    section.className = "verification-details";
    section.innerHTML = '<h2 class="section-title">Government / Legal Metrology check</h2>' +
      '<p class="muted">Reference: Department of Consumer Affairs — Legal Metrology (Packaged Commodities).</p>' +
      '<div class="resultGrid">' +
      '<div class="metric"><span>FSSAI number</span><b data-v="fssai"></b></div>' +
      '<div class="metric"><span>Label declaration signals</span><b data-v="score"></b></div>' +
      '<div class="metric"><span>Government verification</span><b data-v="status"></b></div>' +
      '</div>' +
      '<p><strong>Manufacturer / packer detected:</strong> <span data-v="company"></span></p>' +
      '<div class="warning"><h3>How LegalLens uses Consumer Affairs data</h3><p>LegalLens compares readable package text with the declaration categories described by the Department of Consumer Affairs. This is a label-compliance signal, not a government certification or proof that a brand is genuine. A local manufacturer can be legitimate if it meets the applicable requirements.</p></div>' +
      '<p><a href="' + CONSUMER_AFFAIRS_SOURCE + '" target="_blank" rel="noopener">Open official Consumer Affairs Legal Metrology reference</a></p>';
    section.querySelector('[data-v="fssai"]').textContent = v.fssai || "Not read";
    section.querySelector('[data-v="score"]').textContent = v.labelComplianceSignals + "/8";
    section.querySelector('[data-v="status"]').textContent = v.status;
    section.querySelector('[data-v="company"]').textContent = v.company || "Not read";
    result.prepend(section);
  }

  const observer = new MutationObserver(() => {
    const raw = localStorage.getItem("legalLensScan");
    if (raw) { try { renderVerification(JSON.parse(raw)); } catch (_) {} }
  });
  observer.observe(result, {childList:true, subtree:true});
})();