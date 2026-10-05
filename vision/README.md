# LegalLens Vision Pipeline — YOLO11 + PaddleOCR

This module detects useful regions on packaged-food images with **YOLO11** and extracts text from those regions with **PaddleOCR**.

## Pipeline

Image → YOLO11 region detection → crop → PaddleOCR → structured OCR → nutrition/ingredient parser → ML screening

### Detection classes

Recommended custom YOLO11 classes:

- `ingredients`
- `nutrition`
- `product_name`
- `allergen`
- `net_quantity`
- `mrp`
- `manufacturer`
- `date`

A pretrained YOLO11 checkpoint can be used for pipeline development, but it does **not** know these custom food-label classes until trained/fine-tuned on an appropriate annotated dataset.

## Install

```bash
pip install -r vision/requirements.txt
```

## Run

```bash
python vision/scan_food_label.py --image path/to/food.jpg
```

Optional custom detector:

```bash
python vision/scan_food_label.py --image path/to/food.jpg --yolo weights/best.pt
```

The output JSON is OCR evidence for downstream processing. It is not a clinical decision by itself.
