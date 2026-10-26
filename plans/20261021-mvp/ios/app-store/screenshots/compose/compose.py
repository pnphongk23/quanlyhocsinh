#!/usr/bin/env python3
"""Ghép ảnh App Store: screenshots/raw/NN-*.png (1179x2556) -> screenshots/final/NN-slug.png (1320x2868) + contact-sheet.png.

Chạy:  python3 compose.py [--raw DIR] [--out DIR] [--config shots.json]
Chỉ cần Pillow (đã có trên máy). Màu, cỡ chữ, bóng lấy từ design/tokens/tokens.json theo tên token trong shots.json.
"""
import argparse, glob, json, os, re, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))


def load_tokens(path):
    data = json.load(open(path, encoding="utf-8"))
    flat = {}
    for group in data.values():
        if isinstance(group, dict):
            flat.update({k: v for k, v in group.items() if isinstance(v, str)})
    return flat


def px(tokens, name):
    return float(re.match(r"-?[\d.]+", tokens[name]).group(0))


def rgba(value):
    value = value.strip()
    if value.startswith("#"):
        h = value[1:]
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
    m = re.match(r"rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*/\s*([\d.]+)\s*\)", value)
    if m:
        r, g, b, a = m.groups()
        return int(r), int(g), int(b), int(float(a) * 255)
    raise ValueError(f"không đọc được màu: {value}")


def shadow_parts(value):
    """'0 8px 24px rgb(20 24 31 / 0.14)' -> (dx, dy, blur, rgba)."""
    m = re.match(r"(-?\d+)(?:px)?\s+(-?\d+)px\s+(\d+)px\s+(.+)$", value)
    return int(m.group(1)), int(m.group(2)), int(m.group(3)), rgba(m.group(4))


def load_font(paths, size, weight):
    for path in paths:
        if os.path.exists(path):
            font = ImageFont.truetype(path, size)
            try:
                font.set_variation_by_name(weight)
            except Exception:
                pass
            return font
    sys.exit("không tìm thấy font nào trong danh sách fonts của shots.json")


def rounded_mask(size, radius, scale=3):
    big = Image.new("L", (size[0] * scale, size[1] * scale), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, big.width - 1, big.height - 1), radius * scale, fill=255)
    return big.resize(size, Image.LANCZOS)


def wrap(draw, text, font, max_width):
    lines, current = [], ""
    for word in text.split():
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def compose(raw_path, shot, cfg, tokens, fonts_cache):
    cw, ch = cfg["canvas"]["width"], cfg["canvas"]["height"]
    scale = cfg["pxScale"]
    canvas = Image.new("RGBA", (cw, ch), rgba(tokens[cfg["colors"]["background"]]))
    draw = ImageDraw.Draw(canvas)

    tcfg = cfg["title"]
    size = int(px(tokens, tcfg["size"]) * scale)
    key = (size, tcfg["weight"])
    if key not in fonts_cache:
        fonts_cache[key] = load_font(cfg["fonts"], size, tcfg["weight"])
    font = fonts_cache[key]
    lead = float(tokens[tcfg["lineHeight"]])
    lines = wrap(draw, shot["title"], font, cw * tcfg["maxWidthRatio"])
    y = px(tokens, tcfg["topSpace"]) * scale
    for line in lines:
        width = draw.textlength(line, font=font)
        draw.text(((cw - width) / 2, y), line, font=font, fill=rgba(tokens[cfg["colors"]["title"]]))
        y += size * lead
    y += px(tokens, cfg["device"]["topGapSpace"]) * scale

    dev = cfg["device"]
    bezel = int(px(tokens, dev["bezelSpace"]) * scale)
    screen_w = int(cw * dev["widthRatio"])
    raw = Image.open(raw_path).convert("RGBA")
    screen_h = round(screen_w * raw.height / raw.width)
    raw = raw.resize((screen_w, screen_h), Image.LANCZOS)
    outer = (screen_w + 2 * bezel, screen_h + 2 * bezel)
    radius = int(screen_w * dev["cornerRatio"])
    x0 = (cw - outer[0]) // 2
    y0 = int(y)

    dx, dy, blur, color = shadow_parts(tokens[dev["shadow"]])
    pad = blur * scale * 2
    layer = Image.new("RGBA", (outer[0] + 2 * pad, outer[1] + 2 * pad), (0, 0, 0, 0))
    layer.paste(Image.new("RGBA", outer, color), (pad, pad), rounded_mask(outer, radius + bezel))
    layer = layer.filter(ImageFilter.GaussianBlur(blur * scale / 2))
    canvas.alpha_composite(layer, (x0 - pad + dx * scale, y0 - pad + dy * scale))

    body = Image.new("RGBA", outer, rgba(tokens[cfg["colors"]["bezel"]]))
    canvas.paste(body, (x0, y0), rounded_mask(outer, radius + bezel))
    canvas.paste(raw, (x0 + bezel, y0 + bezel), rounded_mask((screen_w, screen_h), radius))

    if shot.get("mascot"):
        path = os.path.join(HERE, cfg["mascotDir"], shot["mascot"])
        if os.path.exists(path):
            mascot = Image.open(path).convert("RGBA")
            mh = int(ch * cfg["mascot"]["heightRatio"])
            mascot = mascot.resize((round(mascot.width * mh / mascot.height), mh), Image.LANCZOS)
            mx = x0 + outer[0] - round(mascot.width * (1 - cfg["mascot"]["overlapRatio"]))
            my = y0 + outer[1] - mh
            canvas.alpha_composite(mascot, (min(mx, cw - mascot.width), my))
        else:
            print(f"THIẾU mascot: {shot['mascot']}", file=sys.stderr)
    return canvas.convert("RGB")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", default=os.path.join(HERE, "..", "raw"))
    parser.add_argument("--out", default=os.path.join(HERE, "..", "final"))
    parser.add_argument("--config", default=os.path.join(HERE, "shots.json"))
    args = parser.parse_args()
    cfg = json.load(open(args.config, encoding="utf-8"))
    tokens = load_tokens(os.path.join(HERE, cfg["tokens"]))
    os.makedirs(args.out, exist_ok=True)
    fonts, done, missing = {}, [], []
    for shot in cfg["shots"]:
        matches = sorted(glob.glob(os.path.join(args.raw, f"{shot['prefix']}-*.png")))
        if not matches:
            missing.append(shot["prefix"])
            continue
        image = compose(matches[0], shot, cfg, tokens, fonts)
        assert image.size == (cfg["canvas"]["width"], cfg["canvas"]["height"])
        target = os.path.join(args.out, f"{shot['prefix']}-{shot['slug']}.png")
        image.save(target)
        done.append(target)
        print("OK", target, image.size)
    if missing:
        print("THIẾU ảnh gốc cho:", ", ".join(missing), file=sys.stderr)
    if done:
        cs = cfg["contactSheet"]
        gap = int(px(tokens, cs["gapSpace"]))
        thumbs = [Image.open(p) for p in done]
        cell_w = cs["cellWidth"]
        cell_h = round(cell_w * thumbs[0].height / thumbs[0].width)
        cols = cs["columns"]
        rows = -(-len(thumbs) // cols)
        sheet = Image.new("RGB", (cols * cell_w + (cols + 1) * gap, rows * cell_h + (rows + 1) * gap),
                          rgba(tokens["color-canvas"])[:3])
        for i, thumb in enumerate(thumbs):
            sheet.paste(thumb.resize((cell_w, cell_h), Image.LANCZOS),
                        (gap + (i % cols) * (cell_w + gap), gap + (i // cols) * (cell_h + gap)))
        sheet.save(os.path.join(args.out, "contact-sheet.png"))
        print("OK contact-sheet.png", sheet.size)
    sys.exit(1 if missing else 0)


if __name__ == "__main__":
    main()
