"""
check_dpi.py — Single-file DPI inspector for InsightEd uploads.
Usage: python check_dpi.py <path_to_file>
"""
import sys
import os

TARGET_DPI = 96
TOLERANCE = 10

def check_pdf(path):
    try:
        import fitz
    except ImportError:
        print("PyMuPDF (fitz) not installed.")
        return
    doc = fitz.open(path)
    print(f"PDF: {os.path.basename(path)}  ({len(doc)} pages)")
    for i, page in enumerate(doc):
        images = page.get_images(full=True)
        if not images:
            print(f"  Page {i+1}: no raster images (vector content)")
            continue
        for img in images:
            xref = img[0]
            base_img = doc.extract_image(xref)
            w, h = base_img["width"], base_img["height"]
            pw = page.rect.width / 72  # inches
            ph = page.rect.height / 72
            dpi_x = round(w / pw) if pw > 0 else 0
            dpi_y = round(h / ph) if ph > 0 else 0
            avg = (dpi_x + dpi_y) / 2
            verdict = "PASS" if abs(avg - TARGET_DPI) <= TOLERANCE else "FAIL"
            print(f"  Page {i+1}: {dpi_x}x{dpi_y} DPI (avg {avg:.0f}) img={w}x{h}px  [{verdict}]")
    doc.close()

def check_image(path):
    try:
        from PIL import Image
    except ImportError:
        print("Pillow not installed.")
        return
    with Image.open(path) as img:
        dpi = img.info.get("dpi")
        print(f"Image: {os.path.basename(path)}  {img.size[0]}x{img.size[1]}px  mode={img.mode}")
        if dpi:
            avg = (dpi[0] + dpi[1]) / 2
            verdict = "PASS" if abs(avg - TARGET_DPI) <= TOLERANCE else "FAIL"
            print(f"  DPI: {dpi[0]}x{dpi[1]} (avg {avg:.0f})  [{verdict}]")
        else:
            print("  DPI: not embedded in metadata  [UNKNOWN]")

def main():
    if len(sys.argv) < 2:
        print("Usage: python check_dpi.py <file_path>")
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"File not found: {path}")
        sys.exit(1)

    ext = os.path.splitext(path)[1].lower()
    size_kb = os.path.getsize(path) / 1024
    print(f"Size: {size_kb:.0f} KB")

    if ext == ".pdf":
        check_pdf(path)
    elif ext in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
        check_image(path)
    else:
        # Try to detect
        with open(path, "rb") as f:
            header = f.read(4)
        if header == b"%PDF":
            check_pdf(path)
        else:
            print(f"Unknown file type (ext='{ext}', header={header!r})")

if __name__ == "__main__":
    main()
