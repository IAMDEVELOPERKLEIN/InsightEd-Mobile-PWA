import os
import sys
import subprocess
import shutil

# Hybrid approach: Prefer PyMuPDF (fitz) if available, fallback to Ghostscript
try:
    import fitz # type: ignore
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False

def compress_pdf_fitz(input_path, output_path, dpi=96):
    """
    Compresses PDF by re-rendering pages to images at target DPI.
    Very effective for reducing size of scanned documents.
    """
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
        return True
    except Exception as e:
        print(f"PyMuPDF Error: {str(e)}")
        return False

def compress_pdf_gs(input_path, output_path, dpi=96):
    """
    Compresses PDF using Ghostscript.
    """
    try:
        gs_command = [
            "gs",
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            "-dPDFSETTINGS=/screen",
            f"-dColorImageResolution={dpi}",
            f"-dGrayImageResolution={dpi}",
            f"-dMonoImageResolution={dpi}",
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            f"-sOutputFile={output_path}",
            input_path
        ]
        
        if os.name == 'nt':
            for cmd in ['gswin64c', 'gswin32c', 'gs']:
                try:
                    subprocess.run([cmd, '--version'], capture_output=True, check=True)
                    gs_command[0] = cmd
                    break
                except (subprocess.CalledProcessError, FileNotFoundError):
                    continue
        
        result = subprocess.run(gs_command, capture_output=True, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"Ghostscript Error: {str(e)}")
        return False

def compress_pdf(input_path, output_path, dpi=96):
    success = False
    
    # Try PyMuPDF first
    if HAS_FITZ:
        print("Using PyMuPDF (fitz) for compression...")
        success = compress_pdf_fitz(input_path, output_path, dpi)
    
    # Try Ghostscript if PyMuPDF failed or wasn't available
    if not success:
        print("Using Ghostscript for compression...")
        success = compress_pdf_gs(input_path, output_path, dpi)
        
    # Final Fallback
    if not success:
        print("Compression failed/unavailable. Falling back to copy.")
        if not os.path.exists(output_path):
            shutil.copy2(input_path, output_path)
        return False
        
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python compress_pdf.py <input_path> [output_path] [dpi]")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_temp = sys.argv[2] if len(sys.argv) > 2 else None
    target_dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 96
    
    if not output_temp:
        dir_name = os.path.dirname(input_file)
        base_name = os.path.basename(input_file)
        name, ext = os.path.splitext(base_name)
        output_temp = os.path.join(dir_name, f"{name}_optimized{ext}")
    
    print(f"Starting compression for {input_file}...")
    try:
        success = compress_pdf(input_file, output_temp, dpi=target_dpi)
        
        if not success:
            print("PDF compression failed all methods.")
            sys.exit(1)
        
        # If output_path wasn't specified, replace the original
        if len(sys.argv) <= 2 and os.path.exists(output_temp):
            try:
                os.replace(output_temp, input_file)
                print("Original file replaced with optimized version.")
            except Exception as e:
                print(f"Error replacing original file: {e}")
                sys.exit(1)
        
        print("SUCCESS: Compression successful.")
        sys.exit(0)
    except Exception as e:
        print(f"FAIL: Unhandled error during compression: {e}")
        sys.exit(1)
