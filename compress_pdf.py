import os
import sys
import subprocess
import shutil
import json

# Hybrid approach: Prefer PyMuPDF (fitz) if available, fallback to Ghostscript
try:
    import fitz # type: ignore
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False

def compress_pdf_fitz(input_path, output_path, dpi=96):
    """
    Smarter PyMuPDF compression:
    1. Structural optimization (garbage collection, deflation).
    2. Image re-compression (rewrite_images).
    3. Aggressive rasterization (only if beneficial).
    """
    temp_files = []
    try:
        doc = fitz.open(input_path)
        if doc.is_encrypted:
            doc.authenticate("")  # Unlock owner-password-only PDFs
        orig_size = os.path.getsize(input_path)
        
        candidates = [] # List of (size, path)

        # Stage 1: Fast Optimization (Structural)
        s1_path = output_path + ".s1.pdf"
        doc.save(s1_path, garbage=4, deflate=True, clean=True)
        candidates.append((os.path.getsize(s1_path), s1_path))
        temp_files.append(s1_path)

        # Stage 2: Image Re-compression (Internal)
        if hasattr(doc, 'rewrite_images'):
            try:
                s2_path = output_path + ".s2.pdf"
                doc.rewrite_images()
                doc.save(s2_path, garbage=4, deflate=True)
                candidates.append((os.path.getsize(s2_path), s2_path))
                temp_files.append(s2_path)
            except:
                 pass

        # Stage 3: Aggressive Rasterization (The original method, as a last resort)
        # We only do this if the file is still large (> 500KB)
        if orig_size > 500 * 1024:
            s3_path = output_path + ".s3.pdf"
            out_doc = fitz.open()
            for page in doc:
                pix = page.get_pixmap(dpi=dpi)
                img_bytes = pix.tobytes("jpeg", jpg_quality=70)
                out_page = out_doc.new_page(width=page.rect.width, height=page.rect.height)
                out_page.insert_image(page.rect, stream=img_bytes)
            out_doc.save(s3_path, garbage=4, deflate=True)
            candidates.append((os.path.getsize(s3_path), s3_path))
            temp_files.append(s3_path)
            out_doc.close()

        doc.close()

        # Pick the absolute best (smallest)
        candidates.sort() # Sort by size
        best_size, best_path = candidates[0]

        if best_size < orig_size:
            shutil.copy2(best_path, output_path)
            print(f"Fitz success: {orig_size} -> {best_size} using {best_path.split('.')[-2]}")
            return True
        else:
            print("Fitz failed to reduce size.")
            return False

    except Exception as e:
        print(f"PyMuPDF Error: {str(e)}")
        return False
    finally:
        for f in temp_files:
            if os.path.exists(f):
                try: os.remove(f)
                except: pass

def compress_pdf_hydra(input_path, output_dir, dpi=120):
    """
    Project Hydra: Convert PDF pages to a sequence of optimized images.
    Returns a list of image paths and the total size.
    """
    if not HAS_FITZ:
        print("Hydra requires PyMuPDF (fitz).")
        return None

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        doc = fitz.open(input_path)
        if doc.is_encrypted:
            doc.authenticate("")  # Unlock owner-password-only PDFs
        manifest = []
        total_size = 0

        for i, page in enumerate(doc):
            # 120 DPI is a good balance for Hydra (better than 96 for text legibility)
            pix = page.get_pixmap(dpi=dpi)
            
            # Use JPEG-80 as the standard Hydra shard format for compatibility
            img_name = f"page_{i+1}.jpg"
            img_path = os.path.join(output_dir, img_name)
            
            # save() also supports jpg_quality
            pix.save(img_path, "jpg", jpg_quality=85)
            
            size = os.path.getsize(img_path)
            total_size += size
            manifest.append({
                "page": i + 1,
                "file": img_name,
                "size": size,
                "width": page.rect.width,
                "height": page.rect.height
            })

        doc.close()
        
        # Save manifest.json in the hydra directory
        with open(os.path.join(output_dir, "manifest.json"), "w") as f:
            json.dump(manifest, f, indent=2)

        print(f"Hydra success: {len(manifest)} pages -> {total_size} bytes in {output_dir}")
        return manifest

    except Exception as e:
        import time
        if "closed or encrypted" in str(e):
            time.sleep(0.1) # Small retry delay for Windows file locks
            try:
                doc = fitz.open(input_path)
                if doc.is_encrypted:
                    doc.authenticate("")
                return _process_hydra_doc(doc, output_dir, dpi)
            except Exception as retry_e:
                file_size = os.path.getsize(input_path) if os.path.exists(input_path) else "N/A"
                print(f"Hydra Error (Retry): {str(retry_e)} | Path exists: {os.path.exists(input_path)} | Size: {file_size}")
        else:
            print(f"Hydra Error: {str(e)}")
        return None

def _process_hydra_doc(doc, output_dir, dpi):
    manifest = []
    total_size = 0
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=dpi)
        img_name = f"page_{i+1}.jpg"
        img_path = os.path.join(output_dir, img_name)
        pix.save(img_path, "jpg", jpg_quality=85)
        size = os.path.getsize(img_path)
        total_size += size
        manifest.append({
            "page": i + 1,
            "file": img_name,
            "size": size,
            "width": page.rect.width,
            "height": page.rect.height
        })
    doc.close()
    with open(os.path.join(output_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Hydra success: {len(manifest)} pages -> {total_size} bytes in {output_dir}")
    return manifest


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
        print("Usage: python compress_pdf.py <input_path> [output_path/dir] [dpi] [--hydra]")
        sys.exit(1)
        
    input_file = sys.argv[1]
    is_hydra = "--hydra" in sys.argv
    
    # Remove flags from arguments
    args = [a for a in sys.argv if not a.startswith("--")]
    
    output_target = args[2] if len(args) > 2 else None
    target_dpi = int(args[3]) if len(args) > 3 else 96
    
    if is_hydra:
        if not output_target:
            output_target = input_file + "_hydra"
        print(f"Starting Hydra transformation for {input_file}...")
        manifest = compress_pdf_hydra(input_file, output_target, dpi=target_dpi or 120)
        if manifest:
            print(f"HYDRA_MANIFEST_FILE: {os.path.join(output_target, 'manifest.json')}")
            sys.exit(0)
        else:
            sys.exit(1)
    
    # Standard compression path
    if not output_target:
        dir_name = os.path.dirname(input_file)
        base_name = os.path.basename(input_file)
        name, ext = os.path.splitext(base_name)
        output_target = os.path.join(dir_name, f"{name}_optimized{ext}")
    
    print(f"Starting standard compression for {input_file}...")
    try:
        success = compress_pdf(input_file, output_target, dpi=target_dpi)
        
        if not success:
            print("PDF compression failed all methods.")
            sys.exit(1)
        
        # If output_path wasn't specified, replace the original
        if len(args) <= 2 and os.path.exists(output_target):
            try:
                os.replace(output_target, input_file)
                print("Original file replaced with optimized version.")
            except Exception as e:
                print(f"Error replacing original file: {e}")
                sys.exit(1)
        
        print("SUCCESS: Compression successful.")
        sys.exit(0)
    except Exception as e:
        print(f"FAIL: Unhandled error during compression: {e}")
        sys.exit(1)
