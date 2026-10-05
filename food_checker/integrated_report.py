from datetime import datetime
from html import escape
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

def build_pdf_report(pdf_path, result, label_result, ocr_text, diseases):
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(pdf_path, pagesize=A4, rightMargin=32, leftMargin=32, topMargin=32, bottomMargin=32)
    story = [
        Paragraph("LegalLens — Final Product & Health Report", styles["Title"]),
        Paragraph("Generated: " + datetime.now().strftime("%Y-%m-%d %H:%M"), styles["Normal"]),
        Spacer(1, 10),
        Paragraph("<b>Overall Product Risk:</b> " + escape(result["overall_risk"]), styles["Heading2"]),
        Paragraph("<b>Health Profile:</b> " + escape(", ".join(diseases) if diseases else "Not provided"), styles["Normal"]),
        Spacer(1, 8),
        Paragraph("<b>Product Recommendation:</b> " + escape(result["overall_recommendation"]), styles["Normal"]),
        Spacer(1, 14),
        Paragraph("1. PRODUCT INGREDIENT ANALYSIS", styles["Heading2"])
    ]

    data = [["Ingredient", "Category", "ML Risk", "Health Concern"]]
    for x in result["items"]:
        data.append([
            escape(x["ingredient"][:70]),
            escape(x["category"]),
            escape(x["ml_risk"]),
            escape(x["health_concern"][:100])
        ])
    table = Table(data, repeatRows=1, colWidths=[145, 100, 60, 165])
    table.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#003366")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("GRID",(0,0),(-1,-1),0.4,colors.grey),
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("FONTSIZE",(0,0),(-1,-1),8),
        ("LEADING",(0,0),(-1,-1),10)
    ]))
    story += [table, Spacer(1, 12)]

    story += [
        Paragraph("2. HEALTH REPORT", styles["Heading2"]),
        Paragraph("<b>Detected health flags:</b> " + escape("; ".join(result["health_flags"]) if result["health_flags"] else "No selected-profile flags detected."), styles["Normal"]),
        Spacer(1, 8)
    ]
    health_data = [["Health profile", "Recommendation"]]
    if diseases:
        for disease in diseases:
            msgs = []
            for x in result["items"]:
                if disease in x["health_concern"].lower():
                    msgs.append(x["health_concern"])
            health_data.append([escape(disease), escape(" | ".join(msgs) if msgs else "No direct flagged ingredient found.")])
    else:
        health_data.append(["Not provided", "Select a health profile for targeted screening."])
    ht = Table(health_data, repeatRows=1, colWidths=[130, 340])
    ht.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#003366")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("GRID",(0,0),(-1,-1),0.4,colors.grey),
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("FONTSIZE",(0,0),(-1,-1),8)
    ]))
    story += [ht, Spacer(1, 12)]

    missing = ", ".join(label_result["missing"]) if label_result["missing"] else "None detected"
    story += [
        Paragraph("3. PRODUCT LABEL SCREENING", styles["Heading2"]),
        Paragraph("<b>Missing/undetected core fields:</b> " + escape(missing), styles["Normal"]),
        Spacer(1, 12),
        Paragraph("4. OCR EXTRACTED TEXT", styles["Heading2"]),
        Paragraph(escape(ocr_text).replace("\n", "<br/>"), styles["Normal"]),
        Spacer(1, 14),
        Paragraph("<b>ML methodology:</b> TF-IDF feature extraction with Logistic Regression, combined with deterministic ingredient and health rules.", styles["Normal"]),
        Spacer(1, 8),
        Paragraph("<b>Important:</b> This is an educational AI screening prototype. It does not provide a medical diagnosis, personalized treatment, official FSSAI/Legal Metrology certification, or final legal verdict. Always verify the original package and consult a qualified professional for medical decisions.", styles["Italic"])
    ]
    doc.build(story)
    return pdf_path

def build_reports(path_prefix, result, label_result, ocr_text, diseases):
    # Backward-compatible alias: final workflow intentionally produces PDF only.
    return build_pdf_report(path_prefix + ".pdf", result, label_result, ocr_text, diseases)
