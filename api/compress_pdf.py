import os
import sys
import subprocess
import shutil

def compress_pdf(input_path, output_path, dpi=75):
    """
    Compresses a PDF file to a target DPI using Ghostscript.
    Ghostscript is widely available and reliable for this purpose.
    """
    try:
        # Ghostscript command for compression
        # -dPDFSETTINGS=/screen typically targets 72-96 DPI
        # We can also use -r75 for specific resolution
        gs_command = [
            "gs",
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            "-dPDFSETTINGS=/screen",
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            f"-sOutputFile={output_path}",
            input_path
        ]
        
        # On Windows, the command might be gswin64c or gswin32c
        if os.name == 'nt':
            # Try common Windows Ghostscript executable names
            for cmd in ['gswin64c', 'gswin32c', 'gs']:
                try:
                    subprocess.run([cmd, '--version'], capture_output=True, check=True)
                    gs_command[0] = cmd
                    break
                except (subprocess.CalledProcessError, FileNotFoundError):
                    continue
        
        result = subprocess.run(gs_command, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Error during compression: {result.stderr}")
            # If Ghostscript fails or isn't found, fallback to just copying the file
            # to avoid breaking the flow, though it won't be compressed.
            if not os.path.exists(output_path):
                shutil.copy2(input_path, output_path)
            return False
            
        return True
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        if not os.path.exists(output_path):
            shutil.copy2(input_path, output_path)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python compress_pdf.py <input_path>")
        sys.exit(1)
        
    input_file = sys.argv[1]
    
    # We'll save the optimized version with a suffix then replace the original
    # or just keep it as the "optimized" version.
    # According to our api/index.js, we expect it to update the file if possible.
    
    dir_name = os.path.dirname(input_file)
    base_name = os.path.basename(input_file)
    name, ext = os.path.splitext(base_name)
    
    output_temp = os.path.join(dir_name, f"{name}_optimized{ext}")
    
    print(f"Starting compression for {input_file}...")
    success = compress_pdf(input_file, output_temp)
    
    if success:
        print(f"Successfully compressed to {output_temp}")
        # Optionally replace the original or let the caller handle it.
        # In our case, we'll replace the original so the URL stays the same.
        try:
            os.replace(output_temp, input_file)
            print("Original file replaced with optimized version.")
        except Exception as e:
            print(f"Error replacing original file: {e}")
    else:
        print("Compression failed, original file kept.")
