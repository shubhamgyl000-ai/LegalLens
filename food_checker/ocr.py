import os
from PIL import Image
import pytesseract

def extract_text(image_path):
    """OCR a food-package image. Install Tesseract separately on Windows."""
    image=Image.open(image_path)
    text=pytesseract.image_to_string(image, config="--psm 6")
    return text.strip()
