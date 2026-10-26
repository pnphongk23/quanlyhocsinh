#!/usr/bin/env python3
"""Create the web, PWA, and iOS icon set from the approved Mít artwork."""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageCms, ImageFilter


PRIMARY = (47, 91, 234)
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()


def load_source(path: Path) -> Image.Image:
    image = Image.open(path)
    if image.mode == "RGBA":
        matte = Image.new("RGB", image.size, PRIMARY)
        matte.paste(image, mask=image.getchannel("A"))
        image = matte
    else:
        image = image.convert("RGB")

    profile = image.info.get("icc_profile")
    if profile:
        try:
            image = ImageCms.profileToProfile(
                image,
                ImageCms.ImageCmsProfile(profile),
                ImageCms.createProfile("sRGB"),
                outputMode="RGB",
            )
        except (ImageCms.PyCMSError, OSError):
            image = image.convert("RGB")
    return image


def save_png(image: Image.Image, path: Path) -> None:
    image.convert("RGB").save(path, format="PNG", icc_profile=SRGB, optimize=True)


def fit_square(image: Image.Image, size: int) -> Image.Image:
    return image.resize((size, size), Image.Resampling.LANCZOS)


def make_maskable(source: Image.Image) -> Image.Image:
    # Segment the old blue gradient so the mascot sits on solid token primary.
    crop = source.copy()
    pixels = cv2.cvtColor(np.asarray(crop), cv2.COLOR_RGB2BGR)
    mask = np.zeros(pixels.shape[:2], dtype=np.uint8)
    bg_model = np.zeros((1, 65), dtype=np.float64)
    fg_model = np.zeros((1, 65), dtype=np.float64)
    cv2.grabCut(
        pixels,
        mask,
        (12, 10, pixels.shape[1] - 24, pixels.shape[0] - 20),
        bg_model,
        fg_model,
        8,
        cv2.GC_INIT_WITH_RECT,
    )
    alpha = np.where(
        (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0
    ).astype(np.uint8)

    # Keep the subject's connected regions and soften only the cut edge.
    count, labels, stats, _ = cv2.connectedComponentsWithStats(alpha, 8)
    if count > 1:
        keep = np.zeros_like(alpha)
        for index in range(1, count):
            if stats[index, cv2.CC_STAT_AREA] >= 24:
                keep[labels == index] = 255
        alpha = keep
    alpha_image = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.7))

    # Subject artwork is 76% of the canvas; the face and mortarboard sit inside
    # the 80%-diameter circular safe area used by Android maskable icons.
    artwork_size = 390
    artwork = crop.resize((artwork_size, artwork_size), Image.Resampling.LANCZOS)
    alpha_image = alpha_image.resize(
        (artwork_size, artwork_size), Image.Resampling.LANCZOS
    )
    result = Image.new("RGB", (512, 512), PRIMARY)
    offset = ((512 - artwork_size) // 2, (512 - artwork_size) // 2)
    result.paste(artwork, offset, alpha_image)
    return result


def generate(
    source_path: Path, web_dir: Path, prototype_dir: Path, ios_dir: Path
) -> None:
    source = load_source(source_path)
    if source.size != (1024, 1024):
        raise ValueError(f"Expected a 1024x1024 source, got {source.size}")

    web_dir.mkdir(parents=True, exist_ok=True)
    prototype_dir.mkdir(parents=True, exist_ok=True)
    ios_dir.mkdir(parents=True, exist_ok=True)

    for target_dir in (web_dir, prototype_dir):
        save_png(fit_square(source, 512), target_dir / "icon-512.png")
        save_png(fit_square(source, 192), target_dir / "icon-192.png")
        save_png(fit_square(source, 180), target_dir / "apple-touch-icon.png")
        save_png(make_maskable(source), target_dir / "icon-maskable-512.png")

        # Tighter square crop from the same artwork for legibility in tabs.
        favicon_crop = source.crop((97, 0, 927, 830))
        favicon_sizes = [16, 32, 48]
        fit_square(favicon_crop, 48).save(
            target_dir / "favicon.ico",
            format="ICO",
            sizes=[(size, size) for size in favicon_sizes],
        )
        save_png(fit_square(favicon_crop, 32), target_dir / "icon-32.png")

    save_png(source, ios_dir / "AppIcon.png")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--web-dir", type=Path, required=True)
    parser.add_argument("--prototype-dir", type=Path, required=True)
    parser.add_argument("--ios-dir", type=Path, required=True)
    args = parser.parse_args()
    generate(args.source, args.web_dir, args.prototype_dir, args.ios_dir)


if __name__ == "__main__":
    main()
