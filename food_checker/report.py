from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

def make_pdf(path, result, ocr_text, label_result, diseases):
    styles=getSampleStyleSheet()
    doc=SimpleDocTemplate(path,pagesize=A4,rightMargin=35,leftMargin=35,topMargin=35,bottomMargin=35)
    story=[Paragraph("LegalLens — Food Health Screening Report",styles["Title"]),
           Paragraph("Generated: "+datetime.now().strftime("%Y-%m-%d %H:%M"),styles["Normal"]),
           Spacer(1,12),
           Paragraph("<b>Health profile:</b> "+(", ".join(diseases) if diseases else "Not provided"),styles["Normal"]),
           Paragraph("<b>Overall ML screening:</b> "+result["overall_risk"],styles["Heading2"])]
    data=[["Ingredient","Category","ML risk","Health concern"]]
    for x in result["items"]:
        data.append([x["ingredient"],x["category"],x["ml_risk"],x["health_concern"]])
    t=Table(data,repeatRows=1,colWidths=[125,105,65,170])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#003366")),
                           ("TEXTCOLOR",(0,0),(-1,0),colors.white),
                           ("GRID",(0,0),(-1,-1),0.5,colors.grey),
                           ("VALIGN",(0,0),(-1,-1),"TOP")]))
    story += [t,Spacer(1,12),
              Paragraph("<b>Recommendation:</b> "+result["overall_recommendation"],styles["Normal"]),
              Spacer(1,8),
              Paragraph("<b>Label fields missing:</b> "+(", ".join(label_result["missing"]) if label_result["missing"] else "None detected"),styles["Normal"]),
              Spacer(1,8),
              Paragraph("<b>OCR text:</b><br/>"+ocr_text.replace("&","&amp;").replace("<","&lt;").replace("\n","<br/>"),styles["Normal"]),
              Spacer(1,12),
              Paragraph("Disclaimer: Educational screening only. Not a medical diagnosis, food-safety certification, or final legal-compliance verdict.",styles["Italic"])]
    doc.build(story)
