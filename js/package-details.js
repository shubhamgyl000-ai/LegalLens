(() => {
  const input = document.getElementById("image");
  const result = document.getElementById("result");
  if (!input || !result) return;

  function first(patterns, text) {
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return m[1].trim();
    }
    return "";
  }

  function details(text) {
    const clean = text.replace(/\r/g, "");
    const lines = clean.split(/\n+/).map(x => x.trim()).filter(Boolean);
    const ingredients = first([/ingredients?\s*[:\-]\s*([\s\S]*?)(?=\n\s*(?:nutrition|contains|allergen|manufactured|marketed|net quantity|mrp|fssai|batch|best before|expiry)\b|$)/i], clean);
    const company = first([/(?:manufactured(?:\s+by)?|packed\s+by|marketed\s+by|brand owner)\s*[:\-]?\s*([^\n]+)/i], clean);
    const brand = first([/brand\s*[:\-]\s*([^\n]+)/i], clean);
    const quantity = first([/(?:net\s*(?:quantity|wt|weight)|quantity)\s*[:\-]?\s*([^\n]+)/i, /(\d+(?:\.\d+)?\s*(?:kg|g|mg|l|ml))\b/i], clean);
    const mrp = first([/(?:mrp|maximum retail price)\s*[:\-]?\s*(?:rs\.?|₹)?\s*([^\n]+)/i], clean);
    const fssai = first([/fssai\s*(?:lic(?:ence|ense)|no\.?|number)?\s*[:\-]?\s*([^\n]+)/i], clean);
    const batch = first([/(?:batch|lot)\s*(?:no\.?|number)?\s*[:\-]?\s*([^\n]+)/i], clean);
    const expiry = first([/(?:best before|expiry|use by)\s*[:\-]?\s*([^\n]+)/i], clean);
    const packageType = /pouch|sachet/i.test(clean) ? "Pouch / sachet" : /bottle/i.test(clean) ? "Bottle" : /jar/i.test(clean) ? "Jar" : /box|carton/i.test(clean) ? "Box / carton" : /can|tin/i.test(clean) ? "Can / tin" : /packet|pack/i.test(clean) ? "Packet" : "Not explicitly stated";
    const material = /polyethylene|polypropylene|plastic|pet\b|hdpe|ldpe/i.test(clean) ? "Plastic (label text detected)" : /glass/i.test(clean) ? "Glass (label text detected)" : /paper|cardboard/i.test(clean) ? "Paper/cardboard (label text detected)" : /aluminium|aluminum|metal/i.test(clean) ? "Metal/aluminium (label text detected)" : "Not stated on readable label";
    return {ingredients: ingredients || "Not clearly read", company: company || "Not clearly read", brand: brand || "Not clearly read", quantity: quantity || "Not clearly read", mrp: mrp || "Not clearly read", fssai: fssai || "Not clearly read", batch: batch || "Not clearly read", expiry: expiry || "Not clearly read", packageType, material, lines};
  }

  let rendering = false;

  function renderPackage(report) {
    if (rendering) return;
    rendering = true;
    const old = result.querySelector(".package-details");
    if (old) old.remove();
    const d = details(report.ocr || "");
    const section = document.createElement("section");
    section.className = "package-details";
    section.innerHTML = `<h2 class="section-title">Package & label details</h2>
      <div class="resultGrid">
        <div class="metric"><span>Brand</span><b data-v="brand"></b></div>
        <div class="metric"><span>Company / manufacturer</span><b data-v="company"></b></div>
        <div class="metric"><span>Package type</span><b data-v="packageType"></b></div>
        <div class="metric"><span>Material</span><b data-v="material"></b></div>
        <div class="metric"><span>Net quantity</span><b data-v="quantity"></b></div>
        <div class="metric"><span>MRP</span><b data-v="mrp"></b></div>
        <div class="metric"><span>FSSAI</span><b data-v="fssai"></b></div>
        <div class="metric"><span>Batch / lot</span><b data-v="batch"></b></div>
        <div class="metric"><span>Best before / expiry</span><b data-v="expiry"></b></div>
      </div>
      <h3>Ingredients</h3><pre data-v="ingredients"></pre>
      <h3>All readable package text</h3><pre data-v="lines"></pre>`;
    Object.entries(d).forEach(([key, value]) => {
      const el = section.querySelector(`[data-v="${key}"]`);
      if (el) el.textContent = Array.isArray(value) ? value.join("\n") : value;
    });
    result.prepend(section);
    rendering = false;
  }

  const observer = new MutationObserver(() => {
    const raw = localStorage.getItem("legalLensScan");
    if (raw) {
      try { renderPackage(JSON.parse(raw)); } catch (_) {}
    }
  });
  observer.observe(result, {childList: true, subtree: true});
})();