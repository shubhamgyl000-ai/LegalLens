(() => {
  const input = document.getElementById("image");
  const result = document.getElementById("result");
  if (!input || !result) return;

  function extractVerification(text) {
    const fssai = (text.match(/fssai\s*(?:lic(?:ence|ense)|no\.?|number)?\s*[:\-]?\s*([0-9]{10,14})/i) || [])[1] || "";
    const company = (text.match(/(?:manufactured(?:\s+by)?|packed\s+by|marketed\s+by)\s*[:\-]?\s*([^\n]+)/i) || [])[1] || "";
    const mandatory = {
      manufacturerOrPacker: /manufactured|packed by|manufactured by/i.test(text),
      netQuantity: /net\s*(?:quantity|wt|weight)|\d+(?:\.\d+)?\s*(?:kg|g|mg|l|ml)/i.test(text),
      mrp: /\bmrp\b|maximum retail price/i.test(text),
      date: /best before|expiry|use by|manufactur(?:ed|ing)\s*date/i.test(text),
      consumerCare: /consumer\s*care|customer\s*care|helpline|toll.?free/i.test(text)
    };
    const score = Object.values(mandatory).filter(Boolean).length;
    const status = fssai ? "FSSAI number detected — verify against the official FoSCoS database" : "No readable FSSAI licence/registration number";
    return {fssai, company: company.trim(), mandatory, labelComplianceSignals: score, status};
  }

  function renderVerification(report) {
    const old = result.querySelector(".verification-details");
    if (old) old.remove();
    const v = extractVerification(report.ocr || "");
    const section = document.createElement("section");
    section.className = "verification-details";
    section.innerHTML = `<h2 class="section-title">Government / authenticity check</h2>
      <div class="resultGrid">
        <div class="metric"><span>FSSAI number</span><b data-v="fssai"></b></div>
        <div class="metric"><span>Verification status</span><b data-v="status"></b></div>
        <div class="metric"><span>Label declarations found</span><b data-v="score"></b></div>
      </div>
      <div class="warning"><h3>Important</h3><p>LegalLens can detect and verify an FSSAI number only when a government verification service/API is connected. A readable number alone does not prove that a company is genuine or government-verified.</p></div>
      <p><strong>Manufacturer / packer detected:</strong> <span data-v="company"></span></p>`;
    section.querySelector('[data-v="fssai"]').textContent = v.fssai || "Not read";
    section.querySelector('[data-v="status"]').textContent = v.status;
    section.querySelector('[data-v="score"]').textContent = v.labelComplianceSignals + "/5";
    section.querySelector('[data-v="company"]').textContent = v.company || "Not read";
    result.prepend(section);
  }

  const observer = new MutationObserver(() => {
    const raw = localStorage.getItem("legalLensScan");
    if (raw) {
      try { renderVerification(JSON.parse(raw)); } catch (_) {}
    }
  });
  observer.observe(result, {childList:true, subtree:true});
})();