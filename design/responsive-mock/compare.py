#!/usr/bin/env python3
"""Ghép 3 khổ của một màn thành 1 ảnh so sánh (390 | 834 | 1440).

    python3 design/responsive-mock/compare.py

Đọc ảnh trong $QLH_EVIDENCE_DIR/ql-004/mock (mặc định /tmp/qlh-evidence) và ghi
<màn>.jpg vào thư mục con `compare/`: nền xám, cách nhau 40px, cao tối đa 1400,
JPEG chất lượng 80. Ảnh không vào repo.
"""
import os
import sys
from pathlib import Path

from PIL import Image

SCREENS = ["attendance", "attendance-long", "attendance-done"]
VIEWPORTS = ["390x844", "834x1112", "1440x900"]
GAP = 40
MAX_HEIGHT = 1400
BACKGROUND = (234, 236, 241)  # --color-canvas
QUALITY = 80

root = Path(os.environ.get("QLH_EVIDENCE_DIR", "/tmp/qlh-evidence")) / "ql-004/mock"
out_dir = root / "compare"
out_dir.mkdir(parents=True, exist_ok=True)

missing = []
for screen in SCREENS:
    shots = []
    for viewport in VIEWPORTS:
        path = root / f"{screen}-{viewport}.png"
        if not path.exists():
            missing.append(str(path))
            continue
        shots.append(Image.open(path).convert("RGB"))
    if not shots:
        continue

    tallest = max(image.height for image in shots)
    scale = min(1.0, MAX_HEIGHT / tallest)
    scaled = [
        image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
        for image in shots
    ]
    width = sum(image.width for image in scaled) + GAP * (len(scaled) - 1)
    height = max(image.height for image in scaled)

    canvas = Image.new("RGB", (width, height), BACKGROUND)
    x = 0
    for image in scaled:
        canvas.paste(image, (x, 0))
        x += image.width + GAP

    target = out_dir / f"{screen}.jpg"
    canvas.save(target, "JPEG", quality=QUALITY, optimize=True)
    print(f"{target}  {width}×{height}  (scale {scale:.2f})")

if missing:
    print("Thiếu ảnh nguồn:", *missing, sep="\n- ")
    sys.exit(1)
