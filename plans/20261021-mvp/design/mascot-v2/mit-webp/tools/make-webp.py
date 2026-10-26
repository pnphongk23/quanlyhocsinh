#!/usr/bin/env python3
"""Tách nền phẳng kem rồi xuất WebP có alpha ở 256 px và 512 px (cạnh dài).

Dùng: python3 make-webp.py <ảnh-nguồn.png> <tên> [out_dir]
Ra: <out_dir>/mit-<tên>.webp (256), <out_dir>/mit-<tên>@2x.webp (512).
Ảnh nguồn phải có nền phẳng sáng (kem/trắng). Giữ cả sao bay rời thân.
Dải dưới chân bị xoá phần bóng đổ xám/kem.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def cutout(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(float)
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    cand = (sat < 0.24) & (mx > 180)
    lab, _ = ndi.label(cand)
    edge = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    fg = ~np.isin(lab, [v for v in np.unique(edge) if v])
    l2, k = ndi.label(fg)
    sizes = ndi.sum(fg, l2, range(1, k + 1))
    big = 1 + int(np.argmax(sizes))
    rows = np.where((l2 == big).any(1))[0]
    ytop, ybot = rows.min(), rows.max()
    low = np.zeros_like(fg)
    low[int(ybot - 0.12 * (ybot - ytop)):] = True
    fg = fg & ~(cand & low)
    l2, k = ndi.label(fg)
    sizes = ndi.sum(fg, l2, range(1, k + 1))
    fg = np.isin(l2, [i + 1 for i, s in enumerate(sizes) if s > 400])
    fg = ndi.binary_erosion(fg, iterations=1)
    alpha = ndi.gaussian_filter(fg.astype(float), 0.9)
    img = Image.fromarray(np.dstack([a, alpha * 255]).astype("uint8"), "RGBA")
    box = img.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    return img.crop(box)


def export(img, side, out, quality):
    c = img.copy()
    c.thumbnail((side, side), Image.LANCZOS)
    c.save(out, "WEBP", quality=quality, method=6, alpha_quality=90)


if __name__ == "__main__":
    src, name = sys.argv[1], sys.argv[2]
    out = sys.argv[3] if len(sys.argv) > 3 else "."
    im = cutout(src)
    for side, suffix in ((256, ""), (512, "@2x")):
        for q in (82, 74, 66, 58, 50):
            f = f"{out}/mit-{name}{suffix}.webp"
            export(im, side, f, q)
            import os
            if os.path.getsize(f) <= 60 * 1024:
                break
        print(f, os.path.getsize(f), q)
