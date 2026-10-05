from pathlib import Path
import tempfile
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from vision.scan_food_label import scan_image

app=FastAPI(title="LegalLens Vision API",version="2.0.0")

@app.get("/health")
def health():
    return {"status":"ok","service":"LegalLens Vision API","version":"2.0.0","pipeline":"YOLO11 + PaddleOCR"}

@app.post("/api/v2/scan")
async def scan(file: UploadFile=File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400,"Upload an image file.")
    data=await file.read()
    if not data: raise HTTPException(400,"Empty image.")
    suffix=Path(file.filename or "upload.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix,delete=False) as tmp:
        tmp.write(data); path=Path(tmp.name)
    try:
        return JSONResponse(scan_image(path))
    except Exception as exc:
        raise HTTPException(500,f"Scan failed: {exc}")
    finally:
        path.unlink(missing_ok=True)
