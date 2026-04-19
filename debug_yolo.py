#!/usr/bin/env python3.11
"""
Debug script: replicates the exact Swift preprocessing + CoreML inference pipeline.
Run: python3 debug_yolo.py path/to/image.jpg
"""

import sys
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import coremltools as ct

MODEL_PATH = os.path.join(os.path.dirname(__file__), "ios/yolo-acne.mlpackage")
MODEL_INPUT_SIZE = 1280
CONFIDENCE_THRESHOLD = 0.25
CLASS_NAMES = ["blackheads", "dark spot", "nodules", "papules", "pustules", "whiteheads"]
CLASS_COLORS = {
    "blackheads": (156, 163, 175),
    "dark spot":  (217, 119, 6),
    "nodules":    (244, 114, 182),
    "papules":    (248, 113, 113),
    "pustules":   (252, 211, 77),
    "whiteheads": (196, 181, 253),
}

def letterbox(image: Image.Image, size: int):
    """Letterbox image to size×size, return (padded_image, scale, pad_x, pad_y)."""
    img_w, img_h = image.size
    scale = min(size / img_w, size / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    pad_x = (size - new_w) // 2
    pad_y = (size - new_h) // 2

    resized = image.resize((new_w, new_h), Image.LANCZOS)
    padded = Image.new("RGB", (size, size), (0, 0, 0))
    padded.paste(resized, (pad_x, pad_y))
    return padded, scale, pad_x, pad_y

def run(image_path: str):
    print(f"\n=== Loading image: {image_path} ===")
    img = Image.open(image_path).convert("RGB")
    img_w, img_h = img.size
    print(f"Original size: {img_w}x{img_h}")

    # ── Step 1: Letterbox (same as Swift preprocessImage) ──
    padded, scale, pad_x, pad_y = letterbox(img, MODEL_INPUT_SIZE)
    print(f"Letterbox: scale={scale:.4f}, pad_x={pad_x}, pad_y={pad_y}")
    padded.save("/tmp/debug_letterboxed.jpg")
    print("Saved letterboxed input → /tmp/debug_letterboxed.jpg")

    # ── Step 2: Load CoreML model and run inference ──
    print(f"\nLoading CoreML model from {MODEL_PATH} ...")
    model = ct.models.MLModel(MODEL_PATH)
    print("Model loaded.")

    input_name = list(model.get_spec().description.input)[0].name
    print(f"Model input name: {input_name}")

    img_array = np.array(padded, dtype=np.float32)  # HWC
    # CoreML image input expects PIL image directly
    output = model.predict({input_name: padded})

    output_name = list(output.keys())[0]
    raw = output[output_name]
    print(f"\nRaw output name: {output_name}, shape: {np.array(raw).shape}")

    arr = np.array(raw)
    # Squeeze batch dim if present: [1,300,6] → [300,6]
    if arr.ndim == 3:
        arr = arr[0]
    print(f"Detections array shape after squeeze: {arr.shape}")

    # ── Step 3: Parse detections (same as Swift parseEndToEndOutput) ──
    detections = []
    for i in range(arr.shape[0]):
        x1, y1, x2, y2, conf, cls_idx = arr[i]
        cls_idx = int(cls_idx)
        if conf < CONFIDENCE_THRESHOLD or cls_idx < 0 or cls_idx >= len(CLASS_NAMES):
            continue
        # Reverse letterbox → original pixel space
        ox1 = (x1 - pad_x) / scale
        oy1 = (y1 - pad_y) / scale
        ox2 = (x2 - pad_x) / scale
        oy2 = (y2 - pad_y) / scale
        detections.append({
            "class": CLASS_NAMES[cls_idx],
            "conf": float(conf),
            "raw": [float(x1), float(y1), float(x2), float(y2)],
            "scaled": [float(ox1), float(oy1), float(ox2), float(oy2)],
        })

    print(f"\n=== {len(detections)} detections above {CONFIDENCE_THRESHOLD} confidence ===")
    for d in detections:
        print(f"  {d['class']:12s} conf={d['conf']:.3f}  raw={[round(v) for v in d['raw']]}  original_px={[round(v) for v in d['scaled']]}")

    # ── Step 4: Draw on original image ──
    draw = ImageDraw.Draw(img)
    for d in detections:
        x1, y1, x2, y2 = d["scaled"]
        color = CLASS_COLORS.get(d["class"], (255, 255, 255))
        draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
        draw.text((x1, max(0, y1 - 14)), f"{d['class']} {d['conf']:.2f}", fill=color)

    out_path = "/tmp/debug_output.jpg"
    img.save(out_path)
    print(f"\nSaved annotated output → {out_path}")
    print("Open both images to compare:")
    print("  Input (letterboxed): /tmp/debug_letterboxed.jpg")
    print("  Output (annotated):  /tmp/debug_output.jpg")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 debug_yolo.py path/to/image.jpg")
        sys.exit(1)
    run(sys.argv[1])
