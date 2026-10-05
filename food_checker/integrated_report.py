from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

def build_reports(path_prefix, result, label_result, ocr_text, diseases):
    rows=[]
    for x in result["items"]:
        rows.append({
            "Report_Type":"Product + Health",
            "Ingredient":x["ingredient"],
            "Category":x["category"],
            "ML_Risk":x["ml_risk"],
            "Health_Concern":x["health_concern"],
            "Recommendation":x["recommendation"]
        })
    rows.append({
        "Report_Type":"Product Summary",
        "Ingredient":"OVERALL",
        "Category":"PRODUCT",
        "ML_Risk":result["overall_risk"],
        "Health_Concern":"; ".join(result["health_flags"]) or "None",
        "Recommendation":result["overall_recommendation"]
    })
    rows.append({
        "Report_Type":"Label Compliance Screening",
        "Ingredient":"LABEL_CHECK",
        "Category":"PRODUCT",
        "ML_Risk":"",
        "Health_Concern":"",
        "Recommendation":"Missing: "+(", ".join(label_result["missing"]) if label_result["missing"] else "None detected")
    })

    import pandas as pd
    csv_path=path_prefix+".csv"
    pd.DataFrame(rows).to_csv(csv_path,index=False)

    pdf_path=path_prefix+".pdf"
    styles=getSampleStyleSheet()
    doc=SimpleDocTemplate(pdf_path,pagesize=A4,rightMargin=32,leftMargin=32,topMargin=32,bottomMargin=32)
    story=[
        Paragraph("LegalLens — Integrated Product & Health Report",styles["Title"]),
        Paragraph("Generated: "+datetime.now().strftime("%Y-%m-%d %H:%M"),styles["Normal"]),
        Spacer(1,10),
        Paragraph("<b>Overall product screening:</b> "+result["overall_risk"],styles["Heading2"]),
        Paragraph("<b>Health profile:</b> "+(", ".join(diseases) if diseases else "Not provided"),styles["Normal"]),
        Spacer(1,10)
    ]
    data=[["Ingredient","Category","ML Risk","Health Concern"]]
    for x in result["items"]:
        data.append([x["ingredient"],x["category"],x["ml_risk"],x["health_concern"]])
    table=Table(data,repeatRows=1,colWidths=[120,105,60,185])
    table.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#003366")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("GRID",(0,0),(-1,-1),0.4,colors.grey),
        ("VALIGN",(0,0),(-1,-1),"TOP")
    ]))
    story += [table,Spacer(1,12),
              Paragraph("<b>Product recommendation:</b> "+result["overall_recommendation"],styles["Normal"]),
              Spacer(1,8),
              Paragraph("<b>Label screening:</b> "+("Missing: "+", ".join(label_result["missing"]) if label_result["missing"] else "Core fields detected"),styles["Normal"]),
              Spacer(1,8),
              Paragraph("<b>OCR text:</b><br/>"+ocr_text.replace("&","&amp;").replace("<","&lt;").replace("\n","<br/>"),styles["Normal"]),
              Spacer(1,12),
              Paragraph("Disclaimer: LegalLens is an educational screening system. It does not provide a medical diagnosis, official food-safety certification, or final legal verdict.",styles["Italic"])]
    doc.build(story)
    return csv_path,pdf_path
