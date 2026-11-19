from PIL import Image, ImageDraw
import os

BRAND = (30, 45, 74, 255)
ACCENT = (242, 106, 46, 255)
WHITE = (255, 255, 255, 255)
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
APP = os.path.join(os.path.dirname(__file__), "..", "app")


def render(size: int, maskable: bool = False, rounded: bool = True) -> Image.Image:
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if rounded:
        radius = int(s * 0.24)
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=BRAND)
    else:
        d.rectangle([0, 0, s - 1, s - 1], fill=BRAND)

    cx = cy = s / 2
    mark = 0.55 if maskable else 0.78
    outer = s * 0.26 * (mark / 0.78)
    mid = outer * 0.69
    inner = outer * 0.38

    def ring(r, alpha, width):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, alpha), width=max(1, int(width)))

    ring(outer, 90, s * 0.012)
    ring(mid, 140, s * 0.013)
    ring(inner, 205, s * 0.014)

    ray = outer * 0.95
    d.line(
        [cx, cy, cx + ray * 0.7071, cy - ray * 0.7071],
        fill=(255, 255, 255, 235),
        width=max(1, int(s * 0.015)),
    )
    dot = s * 0.034 * (mark / 0.78)
    d.ellipse([cx - dot, cy - dot, cx + dot, cy + dot], fill=WHITE)

    ax = s * (0.755 if not maskable else 0.72)
    ay = s * (0.245 if not maskable else 0.28)
    ar = s * (0.058 if not maskable else 0.052)
    d.ellipse([ax - ar - s * 0.012, ay - ar - s * 0.012, ax + ar + s * 0.012, ay + ar + s * 0.012], fill=BRAND)
    d.ellipse([ax - ar, ay - ar, ax + ar, ay + ar], fill=ACCENT)

    return img.resize((size, size), Image.LANCZOS)


def render_small(size: int) -> Image.Image:
    scale = 8
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=BRAND)

    cx = cy = s / 2
    outer = s * 0.28
    inner = s * 0.145
    ring_w = max(1, int(s * 0.038))
    d.ellipse([cx - outer, cy - outer, cx + outer, cy + outer], outline=WHITE, width=ring_w)
    d.ellipse([cx - inner, cy - inner, cx + inner, cy + inner], outline=WHITE, width=ring_w)
    d.line([cx, cy, cx + outer * 0.72, cy - outer * 0.72], fill=WHITE, width=ring_w)
    dot = s * 0.045
    d.ellipse([cx - dot, cy - dot, cx + dot, cy + dot], fill=WHITE)

    ax, ay = s * 0.755, s * 0.245
    ar = s * 0.075
    d.ellipse([ax - ar - s * 0.018, ay - ar - s * 0.018, ax + ar + s * 0.018, ay + ar + s * 0.018], fill=BRAND)
    d.ellipse([ax - ar, ay - ar, ax + ar, ay + ar], fill=ACCENT)
    return img.resize((size, size), Image.LANCZOS)


def save(img: Image.Image, name: str):
    path = os.path.join(OUT, name)
    img.save(path, "PNG")
    print("saved", path, img.size)


def main():
    os.makedirs(OUT, exist_ok=True)
    save(render(512), "icon-512.png")
    save(render(192), "icon-192.png")
    save(render(180, rounded=False), "apple-touch-icon.png")
    save(render(512, maskable=True, rounded=False), "maskable-512.png")
    save(render(192, maskable=True, rounded=False), "maskable-192.png")
    save(render_small(48), "favicon-48.png")
    save(render_small(32), "favicon-32.png")
    save(render_small(16), "favicon-16.png")

    icon = render(512)
    icon.save(os.path.join(APP, "icon.png"), "PNG")
    print("saved app/icon.png")

    ico = render_small(64)
    ico.save(os.path.join(OUT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    print("saved public/icons/favicon.ico")


if __name__ == "__main__":
    main()
