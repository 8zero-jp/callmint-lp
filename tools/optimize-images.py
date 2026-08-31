#!/usr/bin/env python3
"""LP の画像を WebP へ変換して軽量化する。

背景・装飾画像は CSS で object-fit:cover + brightness フィルタが掛かるため、
長辺 1600px / quality 72 まで落としても見た目は変わらない。
写真として見せる画像（人物・店舗カット）は長辺 1200px / quality 82 で残す。

使い方:  python3 tools/optimize-images.py [--check]
  --check … 変換せず、閾値超過の画像があれば exit 1（CI 用）
"""
import sys
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = os.path.join(ROOT, "images")

# name -> (max_edge, quality)  ※装飾背景は強めに、見せる写真は控えめに
PROFILES = {
    "cta-storefront.png": (1600, 70),
    "ghost-shark-waveform.png": (1600, 70),
    "hero-hands.png": (1400, 74),
    "salon2.png": (1600, 70),
    "bonherhair.jpg": (1200, 82),
    "hoshikawa.jpg": (600, 84),
}

# 1ファイルあたりの上限（KB）。超えたら --check で失敗させる。
BUDGET_KB = 400
# ページ全体の画像合計の上限（KB）
TOTAL_BUDGET_KB = 1200


def target_name(src: str) -> str:
    return os.path.splitext(src)[0] + ".webp"


def convert(src_name: str, max_edge: int, quality: int) -> str:
    src = os.path.join(IMAGES, src_name)
    dst = os.path.join(IMAGES, target_name(src_name))
    im = Image.open(src)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        # 完全不透明なら alpha を捨てる（WebP が一段小さくなる）
        alpha = im.getchannel("A")
        if alpha.getextrema() == (255, 255):
            im = im.convert("RGB")
    else:
        im = im.convert("RGB")
    w, h = im.size
    if max(w, h) > max_edge:
        scale = max_edge / max(w, h)
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    im.save(dst, "WEBP", quality=quality, method=6)
    return dst


def main() -> int:
    check_only = "--check" in sys.argv
    total = 0
    over = []
    for name, (max_edge, quality) in PROFILES.items():
        src = os.path.join(IMAGES, name)
        dst = os.path.join(IMAGES, target_name(name))
        if not check_only:
            if not os.path.exists(src):
                # 既に元 PNG/JPG を削除済み。webp があれば正常。
                if os.path.exists(dst):
                    total += os.path.getsize(dst)
                    continue
                print(f"missing: {name}")
                continue
            convert(name, max_edge, quality)
        if not os.path.exists(dst):
            print(f"missing webp: {target_name(name)}")
            over.append(target_name(name))
            continue
        kb = os.path.getsize(dst) / 1024
        total += os.path.getsize(dst)
        flag = ""
        if kb > BUDGET_KB:
            over.append(target_name(name))
            flag = f"  ← 予算 {BUDGET_KB}KB 超過"
        print(f"{kb:8.1f}KB  {target_name(name)}{flag}")

    total_kb = total / 1024
    print(f"---\n合計 {total_kb:.1f}KB / 予算 {TOTAL_BUDGET_KB}KB")
    if total_kb > TOTAL_BUDGET_KB:
        over.append(f"合計 {total_kb:.0f}KB")

    if check_only and over:
        print("画像予算オーバー: " + ", ".join(over))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
