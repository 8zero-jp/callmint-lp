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
import sys
from datetime import date

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def site_url() -> str:
    """公開ドメインの正本は seo/keywords.json の "site"。

    MOYO Call を moyo.tokyo 配下へ移すときは、そこ1箇所を書き換えれば
    sitemap・canonical・構造化データの生成がすべて追従する。
    環境変数 MOYO_SITE_URL があればそれを優先する（移行の検証用）。
    """
    env = os.environ.get("MOYO_SITE_URL")
    if env:
        return env.rstrip("/")
    try:
        with open(os.path.join(ROOT, "seo", "keywords.json"), encoding="utf-8") as f:
            return json.load(f)["site"].rstrip("/")
    except Exception:
        return "https://callmintai.com"


SITE = site_url()
changed: list[str] = []


def log(msg: str) -> None:
    changed.append(msg)
    print("fix:", msg)


def rel(p: str) -> str:
    return os.path.relpath(p, ROOT).replace(os.sep, "/")


def url_of(p: str) -> str:
    r = rel(p)
    return "/" + (r[: -len("index.html")] if r.endswith("index.html") else r)



# 実ページではない HTML。監査も自動修正もしない。
#   og-image.html            … OG 画像を書き出すための内部テンプレート
#   google*.html             … Search Console の所有権確認ファイル。
#                              **1バイトでも変えると確認に失敗する**ので絶対に触らない
#   lp/**                    … 広告（Instagram等）専用のLP。生成物であり、
#                              lp-src/ のテンプレートと設定から `npm run build:lp` で作る。
#                              **ここを直接書き換えると次のビルドで消える**ので触らない。
#                              検索インデックスにも載せない（noindex）ため監査の対象外。
def is_page(rel_path: str) -> bool:
    if rel_path == "og-image.html":
        return False
    if rel_path.startswith("lp/"):
        return False
    if re.fullmatch(r"google[0-9a-f]+\.html", rel_path):
        return False
    return True

def all_pages() -> list[str]:
    out: list[str] = []
    for pat in ("*.html", "*/index.html", "*/*/index.html"):
        out += glob.glob(os.path.join(ROOT, pat))
    return sorted(p for p in out if is_page(rel(p)))



def hero_src(page: str, html: str) -> str | None:
    """そのページが実際に表示しているヒーロー画像の src を返す。

    記事によって自前の hero（相対パス）と共有 hero（/blog/hero.webp）が混ざる。
    決め打ちで "hero.webp" を使うと、共有 hero のページで存在しないファイルを
    指してしまう。必ず本文の <img> から取る。
    """
    m = re.search(r'<img[^>]*class="article-hero-img"[^>]*>', html)
    if not m:
        m = re.search(r'<img[^>]*src="([^"]*hero\.webp)"[^>]*>', html)
        if not m:
            return None
        src = m.group(1)
    else:
        sm = re.search(r'src="([^"]+)"', m.group(0))
        if not sm:
            return None
        src = sm.group(1)
    f = os.path.join(ROOT, src.lstrip("/")) if src.startswith("/") else os.path.join(os.path.dirname(page), src)
    return src if os.path.exists(f) else None


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
        src = hero_src(p, s)

        # 存在しないファイルを指す preload は、無駄なリクエストを1本増やすだけ
        stale = re.search(r'<link rel="preload" as="image" href="([^"]+)"[^>]*>\n?', s)
        if stale:
            f = os.path.join(ROOT, stale.group(1).lstrip("/")) if stale.group(1).startswith("/") \
                else os.path.join(os.path.dirname(p), stale.group(1))
            if os.path.exists(f):
                continue
            s = s[: stale.start()] + s[stale.end():]
            log(f"{rel(p)}: 存在しない画像への preload を削除（{stale.group(1)}）")
            open(p, "w", encoding="utf-8").write(s)

        if not src:
            continue
        anchor = '<link rel="preconnect" href="https://fonts.googleapis.com">'
        if anchor not in s:
            continue
        s = s.replace(anchor, f'<link rel="preload" as="image" href="{src}" fetchpriority="high">\n' + anchor, 1)
        open(p, "w", encoding="utf-8").write(s)
        log(f"{rel(p)}: ヒーロー画像を preload（{src}）")


# ------------------------------------------- 4. Article schema に image を入れる
def fix_article_image() -> None:
    for p in sorted(glob.glob(os.path.join(ROOT, "blog", "*", "index.html"))):
        s = open(p, encoding="utf-8").read()
        if '"image"' in s:
            continue
        slug = os.path.basename(os.path.dirname(p))
        src = hero_src(p, s)
        if not src:
            continue
        img = SITE + (src if src.startswith("/") else f"/blog/{slug}/{src}")
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


# --------------------------------------------- ドメイン移行（明示指定のときだけ）
def migrate_domain(old: str, new: str) -> None:
    """ページ内の絶対URLを一括で新ドメインへ書き換える。

    canonical / og:url / twitter / 構造化データの @id・item・image・url が対象。
    seo/keywords.json の site も更新するので、以後の sitemap 生成が追従する。
    301 の設定と Search Console のアドレス変更は**別途人間がやること**。
    """
    old = old.rstrip("/")
    new = new.rstrip("/")
    n = 0
    for p in all_pages() + [os.path.join(ROOT, "llms.txt")]:
        if not os.path.exists(p):
            continue
        s = open(p, encoding="utf-8").read()
        if old not in s:
            continue
        open(p, "w", encoding="utf-8").write(s.replace(old, new))
        log(f"{rel(p)}: {old} → {new}")
        n += 1

    kw = os.path.join(ROOT, "seo", "keywords.json")
    if os.path.exists(kw):
        with open(kw, encoding="utf-8") as f:
            data = json.load(f)
        if data.get("site", "").rstrip("/") != new:
            data["site"] = new
            with open(kw, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write("\n")
            log(f"seo/keywords.json: site を {new} に")
    # メールアドレスは URL ではないので触らない。実際に新ドメインで
    # メールボックスを用意するかどうかは事業側の判断で、勝手に変えると
    # 問い合わせが宛先不明になる。
    # 探すのは https:// 付きの URL ではなくホスト名。メールアドレスは
    # スキームを持たないので、URL で探すと取りこぼす。
    old_host = old.split("//", 1)[-1]
    left = [rel(f) for f in all_pages() if old_host in open(f, encoding="utf-8").read()]
    if left:
        print(f"\n※ 次のファイルには {old_host} が残っている（メールアドレスなど URL でない参照）: "
              + ", ".join(left) + "\n  新ドメインのメールボックスを用意してから手で直すこと。")

    print(f"\n{n}ファイルを書き換えた。次にやること:\n"
          f"  1. 旧ドメインで {old}/<path> → {new}/<path> の**1対1** 301 を設定する\n"
          f"     （トップにまとめてリダイレクトすると評価が渡らない）\n"
          f"  2. Search Console で新プロパティを登録し、アドレス変更ツールを使う\n"
          f"  3. 旧ドメインは最低2年維持する（切ると 301 が消えて評価が落ちる）\n"
          f"  4. python3 tools/seo_audit.py --strict が通ることを確認する")


def planned_site() -> str:
    """移行先として決まっているドメイン（seo/keywords.json の plannedSite）。"""
    try:
        with open(os.path.join(ROOT, "seo", "keywords.json"), encoding="utf-8") as f:
            return json.load(f).get("plannedSite", "").rstrip("/")
    except Exception:
        return ""


def preflight(old: str, new: str) -> None:
    """--yes が無いときは書き換えずに、先にやることだけを出す。

    DNS も 301 も無いうちに canonical を新ドメインへ向けると、Google は
    「存在しない正規URL」を見ることになり、インデックスから落ちる。
    順番を間違えると復旧に数ヶ月かかるので、意図的に1段止めている。
    """
    print(f"""ドメイン移行の下ごしらえ: {old} → {new}

まだ何も書き換えていない。**先に** 次の3つが動いていることを確認すること。

  1. {new} が実際にサイトを配信している（DNS とホスティングが済んでいる）
  2. {old}/<path> → {new}/<path> の **1対1** の 301 が設定済み
     （トップにまとめてリダイレクトすると評価が渡らない）
  3. Search Console に {new} のプロパティを登録済み

3つとも済んでいるなら、書き換えを実行する:

  python3 tools/seo_fix.py --migrate-domain --yes
  python3 tools/seo_fix.py
  python3 tools/seo_audit.py --strict

そのあと人間がやること:

  - Search Console の **アドレス変更ツール** を使う（省くと別サイト扱いが数ヶ月続く）
  - GitHub secret の GSC_SITE_URL を新プロパティへ差し替える
  - {old} は最低2年維持する（切ると 301 が消えて評価が落ちる）

いま {new} へ向けたらどれだけ直すことになるかは、これで確認できる:

  MOYO_SITE_URL={new} python3 tools/seo_audit.py""")


def main() -> int:
    if "--migrate-domain" in sys.argv:
        i = sys.argv.index("--migrate-domain")
        arg = sys.argv[i + 1] if len(sys.argv) > i + 1 else ""
        new = arg if arg.startswith("http") else planned_site()
        if not new:
            print("移行先が決まっていない。seo/keywords.json の plannedSite を設定するか、"
                  "URL を直接渡す:\n"
                  "  python3 tools/seo_fix.py --migrate-domain https://call.moyo.tokyo --yes")
            return 2
        if new.rstrip("/") == SITE:
            print(f"すでに {SITE} で配信している。移行は不要。")
            return 0
        if "--yes" not in sys.argv:
            preflight(SITE, new)
            return 0
        migrate_domain(SITE, new)
        return 0

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
