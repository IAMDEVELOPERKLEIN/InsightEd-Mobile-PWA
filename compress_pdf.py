import sys
import fitz  # type: ignore

def compress_pdf(input_path, output_path, dpi=72):
    try:
        doc = fitz.open(input_path)
        out_doc = fitz.open()

        for page in doc:
            # Render page to an image with the specified DPI
            pix = page.get_pixmap(dpi=dpi)
            
            # Convert the pixmap to jpeg bytes for maximum compression
            img_bytes = pix.tobytes("jpeg", jpg_quality=70)
            
            # Create a new page with the exact dimensions of the original
            out_page = out_doc.new_page(width=page.rect.width, height=page.rect.height)
            
            # Insert the newly rendered image filling the entire page
            out_page.insert_image(page.rect, stream=img_bytes)

        # Save with compression options enabled
        out_doc.save(output_path, garbage=4, deflate=True)
        out_doc.close()
        doc.close()
        print(f"SUCCESS: Compressed PDF saved to {output_path}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python compress_pdf.py <input.pdf> <output.pdf>")
        sys.exit(1)
        
    in_pdf = sys.argv[1]
    out_pdf = sys.argv[2]
    # Optionally parse third argument for custom DPI, default to 72
    target_dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 72
    
    compress_pdf(in_pdf, out_pdf, dpi=target_dpi)
