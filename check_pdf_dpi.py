import fitz  # PyMuPDF
import sys


def check_pdf_dpi(file_path):
    doc = fitz.open(file_path)
    for i, page in enumerate(doc):
        # Note: This is an approximation for embedded images
        imgs = page.get_images(full=True)
        print(f"Page {i+1} has {len(imgs)} images.")
        for img in imgs:
            xref = img[0]
            pix = fitz.Pixmap(doc, xref)
            print(f"  - Image XREF {xref}: Resolution {pix.width}x{pix.height}, DPI {pix.xres}x{pix.yres}")
    doc.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_pdf_dpi.py <file.pdf>")
        sys.exit(1)
    check_pdf_dpi(sys.argv[1])
