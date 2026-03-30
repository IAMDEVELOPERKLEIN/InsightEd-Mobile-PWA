#!/usr/bin/env python3
"""
Server-side image optimizer for InsightEd project photos.
Resizes images wider than max_width and compresses to target quality.
Usage: python compress_image.py <input_path> <output_path>
"""
import sys
import os

def compress_image(input_path, output_path, max_width=1600, quality=70):
    try:
        from PIL import Image, ImageSequence
    except ImportError:
        print("Pillow not installed. Copying file as-is.")
        import shutil
        shutil.copy2(input_path, output_path)
        return

    ext = os.path.splitext(input_path)[1].lower()

    if ext == '.gif':
        with Image.open(input_path) as img:
            # Optimize GIF by saving with optimization and global palette
            frames = []
            for frame in ImageSequence.Iterator(img):
                # Resize frame if needed
                if frame.width > max_width:
                    ratio = max_width / frame.width
                    new_height = int(frame.height * ratio)
                    frame = frame.resize((max_width, new_height), Image.LANCZOS)
                frames.append(frame.copy())
            
            if len(frames) > 1:
                other_frames = [f for i, f in enumerate(frames) if i > 0]
                frames[0].save(
                    output_path, 
                    save_all=True, 
                    append_images=other_frames, 
                    optimize=True, 
                    duration=img.info.get('duration', 100),
                    loop=img.info.get('loop', 0)
                )
            elif frames:
                frames[0].save(output_path, optimize=True)
    else:
        with Image.open(input_path) as img:
            # Normalize to RGB (handles PNG with transparency, CMYK, etc.)
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')

            # Resize only if wider than max_width
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.LANCZOS)
                print(f"   Resized to {max_width}x{new_height}")

            img.save(output_path, 'JPEG', quality=quality, optimize=True, dpi=(96, 96))

    original_kb = os.path.getsize(input_path) / 1024
    compressed_kb = os.path.getsize(output_path) / 1024
    reduction = ((original_kb - compressed_kb) / original_kb * 100) if original_kb > 0 else 0
    print(f"Image compressed: {original_kb:.0f}KB -> {compressed_kb:.0f}KB ({reduction:.0f}% reduction)")


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: compress_image.py <input_path> <output_path>")
        sys.exit(1)
    compress_image(sys.argv[1], sys.argv[2])
