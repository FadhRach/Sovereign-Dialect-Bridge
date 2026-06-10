"""Generate dotted Indonesia map SVG from indonesianmap.jpeg.

Sample the grayscale image on a grid; emit a dot wherever the pixel is dark
enough to be land. Output is a single-file SVG used as a decorative
background by Hero.tsx and AuthBrandPanel.tsx.

Run: python3 frontend/scripts/gen_indonesia_dots.py
"""

from pathlib import Path
from PIL import Image

SRC = Path(__file__).parent.parent / "public" / "indonesianmap.jpeg"
DST = Path(__file__).parent.parent / "public" / "indonesia-dotted.svg"

SPACING = 14       # grid step (px on source image)
RADIUS = 3.6       # dot radius (px on source image)
THRESHOLD = 200    # gray <= threshold => land
COLOR = "#2563EB"  # brand-blue


def main() -> None:
    img = Image.open(SRC).convert("L")
    width, height = img.size
    pixels = img.load()

    dots = []
    for y in range(0, height, SPACING):
        for x in range(0, width, SPACING):
            if pixels[x, y] <= THRESHOLD:
                dots.append((x, y))

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'preserveAspectRatio="xMidYMid meet" aria-hidden="true">',
        f'<g fill="{COLOR}">',
    ]
    parts.extend(f'<circle cx="{x}" cy="{y}" r="{RADIUS}"/>' for x, y in dots)
    parts.append("</g></svg>")

    DST.write_text("".join(parts))
    print(f"Generated {len(dots)} dots from {width}x{height} image")
    print(f"Output: {DST} ({DST.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
