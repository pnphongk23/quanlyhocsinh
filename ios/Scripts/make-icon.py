#!/usr/bin/env python3
"""Sinh asset catalog + app icon 1024x1024 cho app Quản lý lớp.

Chạy: python3 ios/Scripts/make-icon.py
Cần Pillow (`python3 -m pip install --user pillow`). Không cần Xcode.

Kết quả (ghi đè mỗi lần chạy):
  QuanLyLop/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png   (1024x1024)
  QuanLyLop/Resources/Assets.xcassets/AccentColor.colorset/Contents.json  (#2B5CE6)
  QuanLyLop/Resources/Assets.xcassets/LaunchBackground.colorset/Contents.json (#2B5CE6)
  QuanLyLop/Resources/Assets.xcassets/Contents.json
"""

from __future__ import annotations

import json
import pathlib

from PIL import Image, ImageDraw

# Xanh chính theo brief (prototype dùng #2F5BEA; brief chốt #2B5CE6).
BRAND_BLUE = (0x2B, 0x5C, 0xE6)
WHITE = (255, 255, 255)

SIZE = 1024
SCALE = 4  # vẽ ở 4x rồi thu nhỏ để viền mượt

ASSETS = pathlib.Path(__file__).resolve().parent.parent / "QuanLyLop/Resources/Assets.xcassets"


def brand_hex() -> str:
    return "0x" + "".join(f"{channel:02X}" for channel in BRAND_BLUE)


def color_entry() -> dict:
    components = {
        "alpha": "1.000",
        "red": f"0x{BRAND_BLUE[0]:02X}",
        "green": f"0x{BRAND_BLUE[1]:02X}",
        "blue": f"0x{BRAND_BLUE[2]:02X}",
    }
    return {
        "colors": [
            {
                "color": {
                    "color-space": "srgb",
                    "components": components,
                },
                "idiom": "universal",
            }
        ],
        "info": {"author": "xcode", "version": 1},
    }


def pages_layer(size: int) -> Image.Image:
    """Một trang sách trắng, bo góc; quay riêng ở nơi khác."""
    page = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(page)
    cx = cy = size // 2
    half_w = int(size * 0.185)
    half_h = int(size * 0.205)
    radius = int(size * 0.028)
    draw.rounded_rectangle(
        (cx - half_w, cy - half_h, cx + half_w, cy + half_h),
        radius=radius,
        fill=WHITE,
    )
    return page


def build_icon() -> Image.Image:
    canvas = SIZE * SCALE
    icon = Image.new("RGB", (canvas, canvas), BRAND_BLUE)

    # Hai trang sách mở, nghiêng nhẹ hai bên cho giống sách đang mở.
    page = pages_layer(canvas)
    left = page.rotate(7, resample=Image.BICUBIC, center=(canvas // 2, canvas // 2))
    right = page.rotate(-7, resample=Image.BICUBIC, center=(canvas // 2, canvas // 2))

    # Dịch hai trang ra hai bên để chúng gặp nhau ở gáy giữa.
    offset = int(canvas * 0.135)
    icon.paste(left, (-offset, 0), left)
    icon.paste(right, (offset, 0), right)

    # Gáy sách: khe xanh ở giữa, bo theo chiều cao của hai trang.
    spine = ImageDraw.Draw(icon)
    spine_width = int(canvas * 0.0075)
    spine.rounded_rectangle(
        (
            canvas // 2 - spine_width,
            int(canvas * 0.283),
            canvas // 2 + spine_width,
            int(canvas * 0.717),
        ),
        radius=spine_width,
        fill=BRAND_BLUE,
    )

    return icon.resize((SIZE, SIZE), Image.LANCZOS)


def write_json(path: pathlib.Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)

    write_json(
        ASSETS / "Contents.json",
        {"info": {"author": "xcode", "version": 1}},
    )

    icon_set = ASSETS / "AppIcon.appiconset"
    icon_set.mkdir(parents=True, exist_ok=True)
    build_icon().save(icon_set / "AppIcon.png")
    write_json(
        icon_set / "Contents.json",
        {
            "images": [
                {
                    "filename": "AppIcon.png",
                    "idiom": "universal",
                    "platform": "ios",
                    "size": "1024x1024",
                }
            ],
            "info": {"author": "xcode", "version": 1},
        },
    )

    for name in ("AccentColor", "LaunchBackground"):
        write_json(ASSETS / f"{name}.colorset/Contents.json", color_entry())

    print(f"Đã sinh icon và asset catalog: {ASSETS} (màu {brand_hex()})")


if __name__ == "__main__":
    main()
