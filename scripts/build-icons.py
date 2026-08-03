#!/usr/bin/env python3
# ==============================================
# BUILD ICONS
# Renders the PNG favicons from the same shape as
# public/favicon.svg.
#
# Why this exists: browsers take the SVG happily, but
# Google Search's favicon documentation lists neither
# SVG among its supported formats nor anything below
# 48x48 as a good idea — and our SVG declares an
# intrinsic 32x32. So the search result needs a real
# raster fallback.
#
# Why it's hand-rolled: the icon is four rounded bars
# on a rounded square. Pulling in a rasterizer (and a
# dependency, and a lockfile entry) to draw that would
# cost more than drawing it. Pure stdlib — zlib and
# struct are all a PNG needs.
#
# Run it after editing public/favicon.svg, or the
# PNGs silently drift from the source shape:
#     python3 scripts/build-icons.py
# ==============================================
import math
import os
import struct
import zlib

# The shape, in the SVG's own 32x32 coordinate space. Keep in step with
# public/favicon.svg — that file stays the source of truth for the design.
CANVAS = 32.0
BACKDROP = (0x13, 0x12, 0x10)
CORNER_RADIUS = 7.0
# A five-step ramp of the default brand hue, light to dark.
BARS = [
    (6.0, 6.0, 20.0, 4.0, 1.2, (0xC5, 0xD9, 0xFF)),
    (6.0, 11.0, 20.0, 4.0, 1.2, (0x8D, 0xB0, 0xFF)),
    (6.0, 16.0, 20.0, 4.0, 1.2, (0x3D, 0x7D, 0xFF)),
    (6.0, 21.0, 20.0, 4.0, 1.2, (0x24, 0x52, 0xB0)),
]

# Samples per pixel per axis. 4 means 16 samples a pixel, which is plenty of
# anti-aliasing for shapes this simple and still renders instantly.
SUPERSAMPLE = 4


def in_rounded_rect(x, y, rx, ry, w, h, r):
    """Standard rounded-rect test: clamp the point into the straight-edged core,
    then ask whether it's within the corner radius of that clamped point."""
    cx = min(max(x, rx + r), rx + w - r)
    cy = min(max(y, ry + r), ry + h - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def render(size, radius):
    """An RGBA buffer at `size` px. `radius` is in SVG units; pass 0 for a
    full-bleed square, which is what iOS wants since it applies its own mask."""
    scale = CANVAS / size
    step = 1.0 / SUPERSAMPLE
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            # Accumulate premultiplied, or the transparent samples along the
            # rounded edge would drag the colour toward black.
            ar = ag = ab = aa = 0.0
            for sy in range(SUPERSAMPLE):
                for sx in range(SUPERSAMPLE):
                    x = (px + (sx + 0.5) * step) * scale
                    y = (py + (sy + 0.5) * step) * scale
                    if radius > 0:
                        if not in_rounded_rect(x, y, 0, 0, CANVAS, CANVAS, radius):
                            continue
                    elif not (0 <= x < CANVAS and 0 <= y < CANVAS):
                        continue
                    colour = BACKDROP
                    for bx, by, bw, bh, br, bc in BARS:
                        if in_rounded_rect(x, y, bx, by, bw, bh, br):
                            colour = bc
                            break
                    ar += colour[0]
                    ag += colour[1]
                    ab += colour[2]
                    aa += 1.0
            n = SUPERSAMPLE * SUPERSAMPLE
            if aa == 0:
                row += bytes((0, 0, 0, 0))
            else:
                row += bytes(
                    (
                        int(round(ar / aa)),
                        int(round(ag / aa)),
                        int(round(ab / aa)),
                        int(round(255.0 * aa / n)),
                    )
                )
        rows.append(bytes(row))
    return rows


def write_png(path, rows, size):
    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    # Filter type 0 (None) on every scanline. The images are tiny; picking
    # smarter filters would save bytes nobody is counting.
    raw = b"".join(b"\x00" + r for r in rows)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)
    return len(png)


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
    targets = [
        # Google wants comfortably more than 48x48 and a square. Keeps the
        # rounded corners and transparent surround, matching the SVG.
        ("icon-192.png", 192, CORNER_RADIUS),
        # iOS masks the icon itself, so this one is deliberately full-bleed and
        # opaque — rounded corners here would show as a double-rounded edge.
        ("apple-touch-icon.png", 180, 0.0),
    ]
    for name, size, radius in targets:
        path = os.path.normpath(os.path.join(root, name))
        written = write_png(path, render(size, radius), size)
        print(f"{name:24} {size}x{size}  {written:,} bytes")


if __name__ == "__main__":
    main()
