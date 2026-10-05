from PIL import Image, ImageOps, ImageEnhance
import pytesseract

def extract_text(image_path):
    """Extract readable label text from a food-package image using Tesseract OCR."""
    image = Image.open(image_path).convert("RGB")
    image = ImageOps.exif_transpose(image)
    image = ImageEnhance.Contrast(image).enhance(1.5)
    image = ImageEnhance.Sharpness(image).enhance(1.5)
    text = pytesseract.image_to_string(image, config="--psm 6")
    return text.strip()
