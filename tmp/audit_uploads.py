"""
audit_uploads.py — Compression Assessment for InsightEd Uploads
Checks PDFs (DPI via PyMuPDF) and images (DPI via Pillow) in uploads/.
Reports adherence to the 96 DPI compression standard.
"""
import os
import sys
import json
from pathlib import Path

try:
    import fitz
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False
    print("⚠️  PyMuPDF (fitz) not available — PDF DPI check disabled")

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("⚠️  Pillow not available — image DPI check disabled")

TARGET_DPI = 96
DPI_TOLERANCE = 10  # ±10 DPI is acceptable


def check_pdf_dpi(path):
    """Returns list of per-page DPI dicts, or error string."""
    if not HAS_FITZ:
        return "PyMuPDF unavailable"
    try:
        doc = fitz.open(path)
        pages_info = []
        for i, page in enumerate(doc):
            images = page.get_images(full=True)
            if not images:
                pages_info.append({"page": i + 1, "status": "no_raster_images", "dpi": None})
                continue
            # Use first image on the page as representative
            img = images[0]
            xref = img[0]
            base_img = doc.extract_image(xref)
            w_px = base_img["width"]
            h_px = base_img["height"]
            # Page dimensions in points (1 pt = 1/72 inch)
            page_w_in = page.rect.width / 72
            page_h_in = page.rect.height / 72
            dpi_x = round(w_px / page_w_in) if page_w_in > 0 else 0
            dpi_y = round(h_px / page_h_in) if page_h_in > 0 else 0
            pages_info.append({"page": i + 1, "dpi_x": dpi_x, "dpi_y": dpi_y, "img_px": f"{w_px}x{h_px}"})
        doc.close()
        return pages_info
    except Exception as e:
        return f"Error: {e}"


def check_image_dpi(path):
    """Returns DPI tuple from image metadata."""
    if not HAS_PIL:
        return "Pillow unavailable"
    try:
        with Image.open(path) as img:
            dpi = img.info.get("dpi", None)
            return {"dpi": dpi, "size_px": img.size, "mode": img.mode}
    except Exception as e:
        return f"Error: {e}"


def assess_pdf(pages_info):
    """Returns 'PASS', 'FAIL', or 'UNKNOWN'."""
    if isinstance(pages_info, str):
        return "UNKNOWN"
    for p in pages_info:
        if p.get("dpi_x") is None:
            continue
        avg = (p["dpi_x"] + p["dpi_y"]) / 2
        if abs(avg - TARGET_DPI) > DPI_TOLERANCE:
            return "FAIL"
    return "PASS"


def assess_image(info):
    if isinstance(info, str) or info.get("dpi") is None:
        return "UNKNOWN"
    dpi = info["dpi"]
    avg = (dpi[0] + dpi[1]) / 2
    return "PASS" if abs(avg - TARGET_DPI) <= DPI_TOLERANCE else "FAIL"


def format_size(path):
    kb = os.path.getsize(path) / 1024
    return f"{kb:.0f} KB"


def audit_directory(base_dir):
    results = []
    pdf_exts = {".pdf"}
    img_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

    # Also scan root uploads for extension-less files (leftover multer temps)
    all_files = []
    for root, dirs, files in os.walk(base_dir):
        # Skip tmp_chunks directory
        dirs[:] = [d for d in dirs if d != "tmp_chunks"]
        for fname in files:
            all_files.append(os.path.join(root, fname))

    for fpath in sorted(all_files):
        p = Path(fpath)
        ext = p.suffix.lower()
        rel = os.path.relpath(fpath, base_dir)
        size = format_size(fpath)

        if ext == ".pdf" or ext == "":
            # Try to detect if extension-less file is a PDF
            is_pdf = ext == ".pdf"
            if not is_pdf:
                try:
                    with open(fpath, "rb") as f:
                        header = f.read(4)
                    is_pdf = header == b"%PDF"
                except:
                    pass

            if is_pdf:
                pages = check_pdf_dpi(fpath)
                status = assess_pdf(pages)
                results.append({
                    "file": rel,
                    "type": "PDF",
                    "size": size,
                    "status": status,
                    "details": pages if not isinstance(pages, str) else pages
                })

        elif ext in img_exts:
            info = check_image_dpi(fpath)
            status = assess_image(info) if isinstance(info, dict) else "UNKNOWN"
            results.append({
                "file": rel,
                "type": "IMAGE",
                "size": size,
                "status": status,
                "details": info
            })

    return results


def main():
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
    uploads_dir = os.path.abspath(uploads_dir)

    if not os.path.isdir(uploads_dir):
        print(f"❌ uploads/ directory not found at: {uploads_dir}")
        sys.exit(1)

    print(f"\n{'='*65}")
    print(f"  InsightEd Upload Compression Audit — Target: {TARGET_DPI} DPI ±{DPI_TOLERANCE}")
    print(f"  Directory: {uploads_dir}")
    print(f"{'='*65}\n")

    results = audit_directory(uploads_dir)

    pass_count = sum(1 for r in results if r["status"] == "PASS")
    fail_count = sum(1 for r in results if r["status"] == "FAIL")
    unknown_count = sum(1 for r in results if r["status"] == "UNKNOWN")

    for r in results:
        icon = {"PASS": "[PASS]", "FAIL": "[FAIL]", "UNKNOWN": "[????]"}.get(r["status"], "?")
        print(f"{icon} [{r['type']:5s}] {r['size']:>10s}  {r['file']}")
        if r["status"] == "FAIL" and r["type"] == "PDF" and isinstance(r["details"], list):
            for pg in r["details"]:
                if pg.get("dpi_x"):
                    avg = (pg["dpi_x"] + pg["dpi_y"]) / 2
                    print(f"           Page {pg['page']}: {pg['dpi_x']}x{pg['dpi_y']} DPI (avg {avg:.0f}) — img {pg.get('img_px','?')}")
        elif r["status"] == "FAIL" and r["type"] == "IMAGE":
            print(f"           DPI: {r['details'].get('dpi')}  size: {r['details'].get('size_px')}")

    print(f"\n{'='*65}")
    print(f"  SUMMARY: {len(results)} files audited")
    print(f"  PASS    : {pass_count} ({pass_count/len(results)*100:.0f}%)" if results else "  No files found.")
    print(f"  FAIL    : {fail_count}")
    print(f"  UNKNOWN : {unknown_count}  (no raster data / no DPI metadata)")
    print(f"{'='*65}\n")

    if fail_count > 0:
        print("NOTE: FAIL means compression did NOT apply 96 DPI (file went through fallback copy or was stored as-is).")
    if unknown_count > 0:
        print("NOTE: UNKNOWN means the file has no embedded raster images (vector PDF) or missing DPI metadata.")


if __name__ == "__main__":
    main()
