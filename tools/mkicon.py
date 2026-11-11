#!/usr/bin/env python3
"""Generate PWA icons for Masjid Kidmat Records — pure stdlib (no PIL).
Emerald gradient square with a white mosque silhouette. Run: python3 mkicon.py"""
import zlib, struct, os
from math import hypot

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

TOP = (0x2f, 0x86, 0xea)   # arctic blue (Shan's picked brand accent)
BOT = (0x1b, 0x53, 0xa8)
DOOR = (0x12, 0x3f, 0x8f)


def in_rounded(x, y, size, r):
    if r <= 0:
        return True
    nx = min(max(x, r), size - r)
    ny = min(max(y, r), size - r)
    return hypot(x - nx, y - ny) <= r + 0.0001


def in_msq(dx, dy):
    if 150 <= dx <= 362 and 290 <= dy <= 378:                # prayer hall
        return True
    if hypot(dx - 256, dy - 290) <= 78 and dy <= 290:        # main dome
        return True
    if 252 <= dx <= 260 and 197 <= dy <= 212:                # finial stem
        return True
    if hypot(dx - 256, dy - 197) <= 9 and dy <= 197:         # finial ball
        return True
    if 150 <= dx <= 174 and 210 <= dy <= 378:                # left minaret
        return True
    if hypot(dx - 162, dy - 210) <= 12 and dy <= 210:        # left dome
        return True
    if 338 <= dx <= 362 and 210 <= dy <= 378:                # right minaret
        return True
    if hypot(dx - 350, dy - 210) <= 12 and dy <= 210:        # right dome
        return True
    return False


def in_door(dx, dy):
    if hypot(dx - 256, dy - 330) <= 20 and dy <= 330:
        return True
    return 236 <= dx <= 276 and 330 <= dy <= 378


def build(size, rounded, content=1.0):
    buf = bytearray(size * size * 4)
    r = 112 * size / 512 if rounded else 0
    k = content * size / 512
    for y in range(size):
        t = y / (size - 1)
        bg = tuple(round(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3))
        for x in range(size):
            if rounded and not in_rounded(x + .5, y + .5, size, r):
                continue
            col = bg
            dx = (x - size / 2) / k + 256
            dy = (y - size / 2) / k + 268
            if in_msq(dx, dy):
                col = DOOR if in_door(dx, dy) else (255, 255, 255)
            i = (y * size + x) * 4
            buf[i:i + 4] = bytes((col[0], col[1], col[2], 255))
    return buf


def write_png(path, w, h, pixels):
    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)
        raw += pixels[y * stride:(y + 1) * stride]

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))

    png = (b"\x89PNG\r\n\x1a\n" +
           chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) +
           chunk(b"IDAT", zlib.compress(bytes(raw), 9)) +
           chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)


def save(name, size, rounded, content=1.0):
    write_png(os.path.join(OUT, name), size, size, build(size, rounded, content))
    print("wrote", name, size)


save("icon-192.png", 192, True)
save("icon-512.png", 512, True)
save("icon-maskable-512.png", 512, False, 0.72)   # full-bleed, safe-zone content
save("apple-touch-icon-180.png", 180, False, 0.86)
print("done ->", os.path.abspath(OUT))
