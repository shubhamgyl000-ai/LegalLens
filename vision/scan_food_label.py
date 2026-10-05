from __future__ import annotations
import json
from pathlib import Path
import cv2
from ultralytics import YOLO
from paddleocr import PaddleOCR

CLASSES=["ingredients","nutrition","product_name","allergen","net_quantity","mrp","manufacturer","date"]

def scan_image(image_path: Path, yolo_weights="yolo11n.pt"):
    detector=YOLO(yolo_weights)
    ocr=PaddleOCR(lang="en")
    image=cv2.imread(str(image_path))
    if image is None: raise ValueError("Could not read image.")
    result=detector.predict(source=image,verbose=False)[0]
    # Full-image OCR is the primary extraction path so readable text outside detected regions is retained.
    full_text=[]
    for page in ocr.predict(image):
        data=getattr(page,"json",None)
        if callable(data): data=data()
        if isinstance(data,str):
            try: data=json.loads(data)
            except Exception: data=None
        if isinstance(data,dict):
            res=data.get("res",data)
            if isinstance(res,dict): full_text.extend(res.get("rec_texts",[]))
    records=[]
    for box in result.boxes:
        x1,y1,x2,y2=box.xyxy[0].cpu().numpy().astype(int).tolist()
        crop=image[max(0,y1):max(y1,y2),max(0,x1):max(x1,x2)]
        if crop.size==0: continue
        texts=[]
        for page in ocr.predict(crop):
            data=getattr(page,"json",None)
            if callable(data): data=data()
            if isinstance(data,str):
                try: data=json.loads(data)
                except Exception: data=None
            if isinstance(data,dict):
                res=data.get("res",data)
                if isinstance(res,dict): texts.extend(res.get("rec_texts",[]))
        cls_id=int(box.cls[0].item()) if box.cls is not None else -1
        records.append({"class_id":cls_id,"class_name":CLASSES[cls_id] if 0<=cls_id<len(CLASSES) else "unknown","confidence":float(box.conf[0].item()),"bbox":[x1,y1,x2,y2],"text":" ".join(texts)})
    return {"pipeline":"YOLO11 + PaddleOCR","full_text":"\n".join(str(x).strip() for x in full_text if str(x).strip()),"lines":[str(x).strip() for x in full_text if str(x).strip()],"regions":records,"warning":"Vision output requires downstream validation; it is not a clinical decision."}
