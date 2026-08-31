#!/usr/bin/env python3
"""機械的に直せる SEO 欠陥を直す。何度流しても結果が変わらない（冪等）。

  python3 tools/seo_fix.py

判断が要るもの（本文の中身・タイトルの言い回し・記事の新規作成）はここでは触らない。
それは tools/seo_daily.mjs（AI エージェント）の担当。
"""
from __future__ import annotations
import glob
import json
import os
import re
import subprocess
from datetime import date

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://callmintai.com"
changed: list[str] = []


def log(msg: str) -> None:
    changed.append(msg)
    print("fix:", msg)


def rel(p: str) -> str:
    return os.path.relpath(p, ROOT).replace(os.sep, "/")


def url_of(p: str) -> str:
    r = rel(p)
    return "/" + (r[: -len("index.html")] if r.endswith("index.html") else r)


def all_pages() -> list[str]:
    out: list[str] = []
    for pat in ("*.html", "*/index.html", "*/*/index.html"):
        out += glob.glob(os.path.join(ROOT, pat))
    return sorted(p for p in out if rel(p) != "og-image.html")


# ---------------------------------------------------------------- 1. hero を WebP へ
def fix_hero_images() -> None:
    for src in sorted(glob.glob(os.path.join(ROOT, "blog", "**", "hero.jpg"), recursive=True)):
        dst = src[: -len(".jpg")] + ".webp"
        if not os.path.exists(dst):
            im = Image.open(src).convert("RGB")
            w, h = im.size
            if w > 1200:
                im = im.resize((1200, round(h * 1200 / w)), Image.LANCZOS)
            im.save(dst, "WEBP", quality=80, method=6)
            log(f"{rel(dst)} を生成（{os.path.getsize(src)//1024}KB → {os.path.getsize(dst)//1024}KB）")
        if os.path.exists(src):
            subprocess.run(["git", "rm", "-q", "--", rel(src)], cwd=ROOT, check=False)
            log(f"{rel(src)} を削除（WebP へ置換）")

    for p in all_pages():
        s = open(p, encoding="utf-8").read()
        n = s.replace("hero.jpg", "hero.webp")
        if n != s:
            open(p, "w", encoding="utf-8").write(n)
            log(f"{rel(p)}: hero.jpg → hero.webp")


# ------------------------------------------------- 2. img に loading / 寸法 / 優先度
def fix_img_attrs() -> None:
    dims: dict[str, tuple[int, int]] = {}

    def dim(page: str, src: str):
        key = (page, src)
        if src.startswith("/"):
            f = os.path.join(ROOT, src.lstrip("/"))
        else:
            f = os.path.join(os.path.dirname(page), src)
        if f in dims:
            return dims[f]
        try:
            dims[f] = Image.open(f).size
        except Exception:
            dims[f] = (0, 0)
        return dims[f]

    for p in all_pages():
        s = open(p, encoding="utf-8").read()
        head, sep, body = s.partition("</head>")
        if not sep:
            continue
        seen = {"first": True}

        def fix(m):
            tag = m.group(0)
            src_m = re.search(r'src="([^"]+)"', tag)
            if not src_m:
                return tag
            src = src_m.group(1)
            is_logo = "lockup" in src
            add = []
            if "loading=" not in tag and "fetchpriority=" not in tag:
                # 記事ヒーローだけ eager。ロゴはヘッダー用なので既定のまま。
                if src.endswith("hero.webp") and seen["first"] and "/blog/" in url_of(p) and url_of(p) != "/blog/":
                    add.append('fetchpriority="high"')
                    seen["first"] = False
                elif is_logo and "white" not in src:
                    pass
                else:
                    add.append('loading="lazy"')
            if "decoding=" not in tag:
                add.append('decoding="async"')
            if "width=" not in tag and not is_logo:
                w, h = dim(p, src)
                if w:
                    add.append(f'width="{w}" height="{h}"')
            if not add:
                return tag
            return tag[:-1].rstrip() + " " + " ".join(add) + ">"

        nb = re.sub(r"<img\b[^>]*>", fix, body)
        if nb != body:
            open(p, "w", encoding="utf-8").write(head + sep + nb)
            log(f"{rel(p)}: img 属性を補完")


# ------------------------------------------------------ 3. 記事ヒーローの preload
def fix_hero_preload() -> None:
    for p in sorted(glob.glob(os.path.join(ROOT, "blog", "*", "index.html"))):
        s = open(p, encoding="utf-8").read()
        if 'as="image"' in s or "hero.webp" not in s:
            continue
        anchor = '<link rel="preconnect" href="https://fonts.googleapis.com">'
        if anchor not in s:
            continue
        s = s.replace(anchor, '<link rel="preload" as="image" href="hero.webp" fetchpriority="high">\n' + anchor, 1)
        open(p, "w", encoding="utf-8").write(s)
        log(f"{rel(p)}: ヒーロー画像を preload")


# ------------------------------------------- 4. Article schema に image を入れる
def fix_article_image() -> None:
    for p in sorted(glob.glob(os.path.join(ROOT, "blog", "*", "index.html"))):
        s = open(p, encoding="utf-8").read()
        if '"image"' in s:
            continue
        slug = os.path.basename(os.path.dirname(p))
        hero = os.path.join(os.path.dirname(p), "hero.webp")
        if not os.path.exists(hero):
            continue
        img = f"{SITE}/blog/{slug}/hero.webp"
        n = re.sub(r'("@type": "Article",)', r'\1\n  "image": "' + img + '",', s, count=1)
        if n != s:
            open(p, "w", encoding="utf-8").write(n)
            log(f"{rel(p)}: Article schema に image を追加")


# --------------------------------- 5. 規約系ページに description / canonical / og
LEGAL = {
    "privacy.html": (
        "MOYO Call（合同会社8ZERO）のプライバシーポリシー。通話データ・予約情報など、"
        "サロンとお客様からお預かりする個人情報の取得目的・管理方法・第三者提供の考え方を記載しています。",
        "プライバシーポリシー",
    ),
    "terms.html": (
        "MOYO Call の利用規約。AI電話自動応答サービスの契約条件、サロン側の遵守事項、"
        "通話録音・データの取り扱い、解約と料金の条件をまとめています。",
        "利用規約",
    ),
    "tokushoho.html": (
        "MOYO Call の特定商取引法に基づく表記。販売事業者（合同会社8ZERO）、料金、"
        "支払方法、契約期間、解約条件、お問い合わせ先を記載しています。",
        "特定商取引法に基づく表記",
    ),
}


def fix_legal_meta() -> None:
    for name, (desc, label) in LEGAL.items():
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            continue
        s = open(p, encoding="utf-8").read()
        orig = s
        url = f"{SITE}/{name}"
        title_m = re.search(r"<title>(.*?)</title>", s, re.S)
        title = title_m.group(1) if title_m else f"{label}｜MOYO Call"
        inject = []
        if 'name="description"' not in s:
            inject.append(f'<meta name="description" content="{desc}">')
        if 'rel="canonical"' not in s:
            inject.append(f'<link rel="canonical" href="{url}">')
        if 'name="robots"' not in s:
            # 規約系はインデックスさせてよいが、検索結果の主役ではない
            inject.append('<meta name="robots" content="index,follow">')
        if 'property="og:title"' not in s:
            inject += [
                '<meta property="og:type" content="website">',
                '<meta property="og:site_name" content="MOYO">',
                '<meta property="og:locale" content="ja_JP">',
                f'<meta property="og:url" content="{url}">',
                f'<meta property="og:title" content="{title}">',
                f'<meta property="og:description" content="{desc}">',
                f'<meta property="og:image" content="{SITE}/images/og-image.png">',
                '<meta name="twitter:card" content="summary_large_image">',
            ]
        if inject and title_m:
            s = s[: title_m.end()] + "\n" + "\n".join(inject) + s[title_m.end():]
        if s != orig:
            open(p, "w", encoding="utf-8").write(s)
            log(f"{name}: description / canonical / OG を追加")


# ------------------------------------------------- 6. タイトルの定型サフィックス短縮
def fix_title_suffix() -> None:
    # 日本語の検索結果は全角30字前後で切れる。定型部分が9字も食っていた。
    for p in all_pages():
        s = open(p, encoding="utf-8").read()
        n = s.replace("<title>", "<title>", 1)
        m = re.search(r"<title>(.*?)</title>", n, re.S)
        if not m:
            continue
        t = m.group(1)
        nt = t.replace(" | MOYO Call ブログ", "｜MOYO").replace("｜MOYO Call ブログ", "｜MOYO")
        if nt == t:
            continue
        n = n[: m.start(1)] + nt + n[m.end(1):]
        open(p, "w", encoding="utf-8").write(n)
        log(f"{rel(p)}: title サフィックスを短縮（{len(t)}字 → {len(nt)}字）")


# ------------------------------------------------------------------ 7. robots.txt
ROBOTS = """User-agent: *
Allow: /

# OG 画像を書き出すためだけの内部テンプレート。実ページではない。
Disallow: /og-image.html

# 生成AI/回答エンジンからの参照は歓迎する（llms.txt を置いている）
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: {site}/sitemap.xml
"""


def fix_robots() -> None:
    p = os.path.join(ROOT, "robots.txt")
    want = ROBOTS.format(site=SITE)
    cur = open(p, encoding="utf-8").read() if os.path.exists(p) else ""
    if cur.strip() != want.strip():
        open(p, "w", encoding="utf-8").write(want)
        log("robots.txt を更新（og-image.html を除外・AIクローラを明示許可）")


# ------------------------------------------------------------------ 8. sitemap.xml
def git_lastmod(p: str) -> str:
    r = subprocess.run(["git", "log", "-1", "--format=%cs", "--", rel(p)],
                       cwd=ROOT, capture_output=True, text=True)
    return (r.stdout.strip() or date.today().isoformat())


def fix_sitemap() -> None:
    rows = []
    for p in all_pages():
        u = url_of(p)
        if u == "/":
            pri, freq = "1.0", "weekly"
        elif u in ("/blog/", "/cases/"):
            pri, freq = "0.9", "weekly"
        elif u.endswith(".html"):
            pri, freq = "0.3", "yearly"
        else:
            pri, freq = "0.8", "monthly"
        # dateModified があればそちらを正とする
        s = open(p, encoding="utf-8").read()
        m = re.search(r'"dateModified": *"(\d{4}-\d{2}-\d{2})', s)
        rows.append((SITE + u, m.group(1) if m else git_lastmod(p), freq, pri))

    body = "\n".join(
        f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{d}</lastmod>\n"
        f"    <changefreq>{f}</changefreq>\n    <priority>{pr}</priority>\n  </url>"
        for u, d, f, pr in rows
    )
    want = ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"{body}\n</urlset>\n")
    p = os.path.join(ROOT, "sitemap.xml")
    cur = open(p, encoding="utf-8").read() if os.path.exists(p) else ""
    if cur != want:
        open(p, "w", encoding="utf-8").write(want)
        log(f"sitemap.xml を再生成（{len(rows)} URL）")


# ------------------------------------ 9. 記事本文の素の <table> にスタイルを与える
# 日次エージェントが書く比較表は、ページごとに違う .compare-table / .comp-table を
# 当てにできない。素の <table> がそのまま整って見えるベーススタイルを全記事に置く。
TABLE_CSS = """
/* seo_fix: 記事本文の素の table 用ベーススタイル（自動挿入・手で消さない） */
.article-body table {
  width: 100%; border-collapse: collapse; font-size: 14.5px; margin: 28px 0;
  display: block; overflow-x: auto;
}
.article-body table th {
  background: var(--surface2); text-align: left; padding: 12px 14px;
  font-weight: 700; border-bottom: 1px solid var(--border); white-space: nowrap;
}
.article-body table td {
  padding: 12px 14px; border-bottom: 1px solid var(--border); vertical-align: top;
}
.article-body table tr:last-child td { border-bottom: none; }
"""


def fix_table_css() -> None:
    for p in sorted(glob.glob(os.path.join(ROOT, "blog", "*", "index.html"))):
        s = open(p, encoding="utf-8").read()
        if "seo_fix: 記事本文の素の table" in s:
            continue
        i = s.rfind("</style>")
        if i < 0:
            continue
        s = s[:i] + TABLE_CSS + s[i:]
        open(p, "w", encoding="utf-8").write(s)
        log(f"{rel(p)}: 素の table 用ベーススタイルを追加")


def main() -> int:
    fix_hero_images()
    fix_article_image()
    fix_legal_meta()
    fix_title_suffix()
    fix_img_attrs()
    fix_hero_preload()
    fix_table_css()
    fix_robots()
    fix_sitemap()
    print(f"\n{len(changed)}件の修正" if changed else "\n修正なし（すべて適合）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
