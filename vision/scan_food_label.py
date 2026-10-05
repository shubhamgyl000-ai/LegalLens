"""LegalLens food-label scanner using YOLO11 + PaddleOCR.

YOLO11 performs region detection; PaddleOCR performs text recognition.
A custom YOLO11 model trained on food-label regions is recommended for
production. The default checkpoint is YOLO11n for pipeline smoke testing.
"""
from __future__ import annotations
import argparse,json
from pathlib import Path
import cv2
from ultralytics import YOLO
from paddleocr import PaddleOCR

CLASSES=["ingredients","nutrition","product_name","allergen","net_quantity","mrp","manufacturer","date"]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--image",required=True)
    ap.add_argument("--yolo",default="yolo11n.pt")
    ap.add_argument("--output",default="vision/output/scan.json")
    args=ap.parse_args()
    image_path=Path(args.image)
    if not image_path.exists(): raise SystemExit(f"Image not found: {image_path}")

    detector=YOLO(args.yolo)
    ocr=PaddleOCR(lang="en")
    image=cv2.imread(str(image_path))
    if image is None: raise SystemExit("Could not read image.")

    result=detector.predict(source=image,verbose=False)[0]
    records=[]
    for box in result.boxes:
        xyxy=box.xyxy[0].cpu().numpy().astype(int)
        x1,y1,x2,y2=xyxy.tolist()
        crop=image[max(0,y1):max(y1,y2),max(0,x1):max(x1,x2)]
        if crop.size==0: continue
        ocr_result=ocr.predict(crop)
        texts=[]
        for page in ocr_result:
            data=getattr(page,"json",None)
            if callable(data): data=data()
            if isinstance(data,str):
                try: data=json.loads(data)
                except Exception: data=None
            if isinstance(data,dict):
                res=data.get("res",data)
                texts.extend(res.get("rec_texts",[]) if isinstance(res,dict) else [])
        cls_id=int(box.cls[0].item()) if box.cls is not None else -1
        records.append({"class_id":cls_id,"class_name":CLASSES[cls_id] if 0<=cls_id<len(CLASSES) else "unknown","confidence":float(box.conf[0].item()),"bbox":[x1,y1,x2,y2],"text":" ".join(texts)})

    out={"pipeline":"YOLO11 + PaddleOCR","image":str(image_path),"regions":records,"warning":"OCR/detection output requires validation; clinical conclusions are produced only by the downstream research ML system."}
    out_path=Path(args.output); out_path.parent.mkdir(parents=True,exist_ok=True); out_path.write_text(json.dumps(out,indent=2,ensure_ascii=False))
    print(json.dumps(out,indent=2,ensure_ascii=False))

if __name__=="__main__": main()
