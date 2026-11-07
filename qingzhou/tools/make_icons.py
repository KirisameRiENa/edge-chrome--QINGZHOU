"""生成扩展图标（纯标准库，无需 Pillow）。

图形：青柠色太阳从墨色地平线升起 —— 与页面里的"日光进度"是同一个隐喻。
按 8 倍超采样绘制后箱式降采样，得到平滑边缘。
"""
import os
import struct
import zlib

LIME = (198, 224, 79)
INK = (27, 25, 23)

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
SIZES = (16, 32, 48, 128)
SS = 8  # 超采样倍数


def write_png(path, width, height, pixels):
    """pixels: bytearray of RGBA, length = width*height*4"""
    raw = b"".join(
        b"\x00" + bytes(pixels[y * width * 4 : (y + 1) * width * 4]) for y in range(height)
    )

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)


def inside_circle(x, y, cx, cy, r):
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def inside_capsule(x, y, x1, x2, cy, half):
    """两端为半圆的胶囊，避免出现生硬的矩形端点。"""
    if x1 <= x <= x2:
        return abs(y - cy) <= half
    if x < x1:
        return (x - x1) ** 2 + (y - cy) ** 2 <= half * half
    return (x - x2) ** 2 + (y - cy) ** 2 <= half * half


def render(size):
    w = size * SS
    # 单位坐标（0..1）换算到超采样画布
    # 半个太阳 + 地平线：太阳正好卡在地平线上，读作"日出"
    cx, r = 0.5 * w, 0.275 * w
    lx1, lx2, ly, lh = 0.145 * w, 0.855 * w, 0.688 * w, 0.044 * w
    cy = ly

    acc = [[0.0, 0.0, 0.0, 0.0] for _ in range(size * size)]

    for py in range(w):
        for px in range(w):
            color = None
            a = 0.0
            if inside_circle(px + 0.5, py + 0.5, cx, cy, r) and py < ly:
                color = LIME
                a = 1.0
            if inside_capsule(px + 0.5, py + 0.5, lx1, lx2, ly, lh):
                color = INK
                a = 1.0
            if a:
                idx = (py // SS) * size + (px // SS)
                acc[idx][0] += color[0]
                acc[idx][1] += color[1]
                acc[idx][2] += color[2]
                acc[idx][3] += 1.0

    pixels = bytearray(size * size * 4)
    n = SS * SS
    for i, (r_, g_, b_, cnt) in enumerate(acc):
        if cnt <= 0:
            continue
        pixels[i * 4 + 0] = int(round(r_ / cnt))
        pixels[i * 4 + 1] = int(round(g_ / cnt))
        pixels[i * 4 + 2] = int(round(b_ / cnt))
        pixels[i * 4 + 3] = int(round(min(1.0, cnt / n) * 255))
    return pixels


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in SIZES:
        path = os.path.join(OUT_DIR, f"icon-{size}.png")
        write_png(path, size, size, render(size))
        print("written", path, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main()
