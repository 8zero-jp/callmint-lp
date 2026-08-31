#!/usr/bin/env python3
"""callmint-lp の SEO 監査。決定的にチェックできるものだけをここで見る。

  python3 tools/seo_audit.py            人間向けレポートを出す
  python3 tools/seo_audit.py --json     機械可読（日次エージェントが読む）
  python3 tools/seo_audit.py --strict   error が1件でもあれば exit 1（CI 用）

「順位」はここでは測らない（外部データが要る）。ここで見るのは、
順位を落とす原因になる自サイト側の欠陥だけ。
"""
from __future__ import annotations
import json
import os
import re
import sys
import glob
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://callmintai.com"

# 検索結果で切れない範囲。日本語は全角基準で数える。
TITLE_MAX = 35
DESC_MIN, DESC_MAX = 70, 130
MIN_INTERNAL_LINKS = 3

findings: list[dict] = []


def add(level: str, page: str, code: str, msg: str) -> None:
    findings.append({"level": level, "page": page, "code": code, "message": msg})


def rel(path: str) -> str:
    return os.path.relpath(path, ROOT).replace(os.sep, "/")


def url_of(path: str) -> str:
    r = rel(path)
    return "/" + (r[: -len("index.html")] if r.endswith("index.html") else r)


def visible_text(html: str) -> str:
    t = re.sub(r"<script.*?</script>|<style.*?</style>", " ", html, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def ld_json(html: str) -> list:
    out = []
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            out.append(json.loads(m.group(1)))
        except json.JSONDecodeError as e:
            out.append({"__parse_error__": str(e)})
    return out


def types_in(obj) -> set:
    found = set()
    stack = [obj]
    while stack:
        o = stack.pop()
        if isinstance(o, dict):
            if isinstance(o.get("@type"), str):
                found.add(o["@type"])
            stack.extend(o.values())
        elif isinstance(o, list):
            stack.extend(o)
    return found


def pages() -> list[str]:
    out = []
    for pat in ("*.html", "*/index.html", "*/*/index.html"):
        out += glob.glob(os.path.join(ROOT, pat))
    return sorted(p for p in out if os.path.basename(os.path.dirname(p)) != "" or True)


def main() -> int:
    as_json = "--json" in sys.argv
    strict = "--strict" in sys.argv

    all_pages = [p for p in pages() if rel(p) != "og-image.html"]
    linked_to: set[str] = set()
    page_meta: dict[str, dict] = {}

    for p in all_pages:
        u = url_of(p)
        html = open(p, encoding="utf-8").read()
        head = html.split("</head>", 1)[0]
        body = html.split("</head>", 1)[1] if "</head>" in html else ""

        # --- head の基本 ---
        title = re.search(r"<title>(.*?)</title>", head, re.S)
        if not title:
            add("error", u, "no-title", "<title> が無い")
        elif len(title.group(1)) > TITLE_MAX:
            add("warn", u, "title-long", f"title が {len(title.group(1))}字（{TITLE_MAX}字以内が安全）: {title.group(1)[:50]}…")

        desc = re.search(r'<meta name="description" content="([^"]*)"', head)
        if not desc:
            add("error", u, "no-description", "meta description が無い")
        else:
            n = len(desc.group(1))
            if n < DESC_MIN or n > DESC_MAX:
                add("warn", u, "description-length", f"meta description が {n}字（{DESC_MIN}〜{DESC_MAX}字が目安）")

        canon = re.search(r'<link rel="canonical" href="([^"]*)"', head)
        if not canon:
            add("error", u, "no-canonical", "canonical が無い")
        elif canon.group(1).rstrip("/") != (SITE + u).rstrip("/"):
            add("error", u, "canonical-mismatch", f"canonical が自 URL と違う: {canon.group(1)}")

        for tag, code in (("og:title", "og-title"), ("og:description", "og-desc"), ("og:image", "og-image")):
            if f'property="{tag}"' not in head:
                add("warn", u, f"no-{code}", f"{tag} が無い")

        if 'rel="preconnect"' not in head and "fonts.googleapis.com" in head:
            add("warn", u, "no-preconnect", "Google Fonts を読むのに preconnect が無い（LCP を落とす）")

        # --- 構造化データ ---
        blocks = ld_json(html)
        for b in blocks:
            if isinstance(b, dict) and "__parse_error__" in b:
                add("error", u, "ld-json-invalid", f"JSON-LD が壊れている: {b['__parse_error__']}")
        t = set()
        for b in blocks:
            t |= types_in(b)

        is_article = u.startswith("/blog/") and u != "/blog/"
        if is_article:
            if "Article" not in t and "BlogPosting" not in t:
                add("error", u, "no-article-schema", "Article/BlogPosting の構造化データが無い")
            if "BreadcrumbList" not in t:
                add("warn", u, "no-breadcrumb", "BreadcrumbList が無い（パンくずのリッチリザルトが出ない）")
            for field in ("datePublished", "dateModified"):
                if f'"{field}"' not in html:
                    add("warn", u, f"no-{field.lower()}", f"Article に {field} が無い")
            if '"image"' not in html:
                add("warn", u, "no-article-image", "Article schema に image が無い（記事のリッチリザルトが出にくい）")

        # --- 本文量 ---
        chars = len(visible_text(body))
        if is_article and chars < 4000:
            add("warn", u, "thin-content", f"本文 {chars}字。上位表示している競合は8,000〜15,000字で、この長さでは1位は取れない")

        # --- 画像 ---
        def resolve(ref: str) -> str:
            if ref.startswith("/"):
                return os.path.join(ROOT, ref.lstrip("/"))
            return os.path.join(os.path.dirname(p), ref)

        # preload が存在しないファイルを指していると、無駄なリクエストが1本増えるだけ
        for ref in re.findall(r'<link[^>]*as="image"[^>]*href="([^"]+)"', head):
            if not ref.startswith("http") and not os.path.exists(resolve(ref)):
                add("error", u, "preload-404", f"存在しない画像を preload している: {ref}")

        for tag in re.findall(r"<img\b[^>]*>", body):
            src = re.search(r'src="([^"]+)"', tag)
            src = src.group(1) if src else "?"
            if src != "?" and not src.startswith(("http", "data:")) and not os.path.exists(resolve(src)):
                add("error", u, "img-404", f"存在しない画像を参照している: {src}")
            if "alt=" not in tag:
                add("error", u, "img-no-alt", f"alt が無い img: {src}")
            # ヘッダーロゴはファーストビュー内なので eager（属性なし）が正しい
            is_header_logo = src.endswith("lockup-call.png")
            if not is_header_logo and "loading=" not in tag and "fetchpriority=" not in tag:
                add("warn", u, "img-no-loading", f"loading/fetchpriority が無い img: {src}")
            if src.endswith((".png", ".jpg", ".jpeg")) and "lockup" not in src and "favicon" not in src:
                add("warn", u, "img-not-webp", f"WebP 化されていない画像: {src}")

        # --- 捏造されやすい表現 ---
        # 実在しない成果・出典のない統計は、過去に実際に載っていた。
        # 機械では真偽を判定できないので「人間が確認する対象」として挙げるだけにする。
        for pat, why in (
            (r"業界平均", "出典の無い業界平均"),
            (r"ある調査では", "出典の無い調査"),
            (r"\d+\s*%が[^。]{0,20}と回答", "出典の無いアンケート結果"),
            (r"導入後[^。]{0,15}(ヶ月|カ月|か月)[^。]{0,30}(増|減|ゼロ|0件)", "実在しない導入成果"),
            (r"多くのサロンで[^。]{0,20}(回収|改善|増加)", "根拠の無い実績主張"),
        ):
            for m in re.finditer(pat, visible_text(body)):
                add("warn", u, "unverified-claim",
                    f"{why}の可能性: 「{m.group(0)}」— 出典を付けるか、読者が自分で見積もる書き方に直す")

        # --- 内部リンク ---
        hrefs = re.findall(r'href="([^"]+)"', body)
        internal = set()
        for h in hrefs:
            if h.startswith("#") or h.startswith("http") or h.startswith("mailto") or h.startswith("tel"):
                continue
            h = h.split("#")[0]
            if not h:
                continue
            if not h.startswith("/"):
                h = os.path.normpath(os.path.join(os.path.dirname(u), h))
                if not h.startswith("/"):
                    h = "/" + h
                if not h.endswith(("/", ".html")):
                    h += "/"
            internal.add(h)
        linked_to |= internal

        if is_article:
            siblings = {h for h in internal if h.startswith("/blog/") and h not in ("/blog/", u)}
            if len(siblings) < MIN_INTERNAL_LINKS:
                add("warn", u, "few-internal-links", f"他記事への内部リンクが {len(siblings)}本（{MIN_INTERNAL_LINKS}本以上に）")

        page_meta[u] = {"chars": chars, "types": sorted(t)}

        # 存在しない内部リンク
        for h in internal:
            target = os.path.join(ROOT, h.lstrip("/"))
            if h.endswith("/"):
                target = os.path.join(target, "index.html")
            if not os.path.exists(target):
                add("error", u, "broken-link", f"リンク先が存在しない: {h}")

    # --- 孤児ページ ---
    for p in all_pages:
        u = url_of(p)
        if u != "/" and u not in linked_to:
            add("warn", u, "orphan", "どこからもリンクされていない（クロールされにくい）")

    # --- sitemap ---
    sm_path = os.path.join(ROOT, "sitemap.xml")
    if not os.path.exists(sm_path):
        add("error", "/sitemap.xml", "no-sitemap", "sitemap.xml が無い")
    else:
        sm = open(sm_path, encoding="utf-8").read()
        listed = set(re.findall(r"<loc>([^<]+)</loc>", sm))
        for p in all_pages:
            full = (SITE + url_of(p))
            if full not in listed and full.rstrip("/") + "/" not in listed:
                add("error", "/sitemap.xml", "sitemap-missing", f"sitemap に無いページ: {url_of(p)}")
        for loc in listed:
            u = loc.replace(SITE, "") or "/"
            target = os.path.join(ROOT, u.lstrip("/"))
            if u.endswith("/"):
                target = os.path.join(target, "index.html")
            if not os.path.exists(target):
                add("error", "/sitemap.xml", "sitemap-404", f"sitemap が存在しない URL を載せている: {u}")

    # --- robots ---
    rb_path = os.path.join(ROOT, "robots.txt")
    if os.path.exists(rb_path):
        rb = open(rb_path, encoding="utf-8").read()
        if "Sitemap:" not in rb:
            add("error", "/robots.txt", "robots-no-sitemap", "robots.txt に Sitemap 行が無い")
        if "og-image.html" not in rb:
            add("warn", "/robots.txt", "robots-og-template", "OG 画像生成用の og-image.html がクロール対象のまま")
    else:
        add("error", "/robots.txt", "no-robots", "robots.txt が無い")

    # --- 画像予算 ---
    total = sum(os.path.getsize(f) for f in glob.glob(os.path.join(ROOT, "images", "*")))
    if total / 1024 > 1200:
        add("error", "/images/", "image-budget", f"images/ 合計 {total/1024/1024:.1f}MB（予算 1.2MB）")

    # --- キーワードマップとの突き合わせ ---
    kw_path = os.path.join(ROOT, "seo", "keywords.json")
    gaps: list[dict] = []
    if os.path.exists(kw_path):
        km = json.load(open(kw_path, encoding="utf-8"))
        pol = km.get("policy", {})
        for cl in km["clusters"]:
            for k in cl["keywords"]:
                u = k["url"]
                target = os.path.join(ROOT, u.lstrip("/"), "index.html") if u.endswith("/") else os.path.join(ROOT, u.lstrip("/"))
                exists = os.path.exists(target)
                chars = page_meta.get(u, {}).get("chars", 0)
                if not u.startswith("/blog/") or u == "/blog/":
                    # LP・事例・一覧はデザイン主導のページ。記事と同じ字数基準では測らない
                    need = pol.get("minCharsLanding", 3000)
                elif u == cl.get("pillar"):
                    need = pol.get("minCharsPillar", 10000)
                else:
                    need = pol.get("minCharsSupporting", 6000)
                if not exists:
                    gaps.append({"kind": "missing-page", "cluster": cl["id"], "keyword": k["kw"],
                                 "url": u, "priority": k["priority"] * cl["priority"],
                                 "detail": "ページが存在しない（新規作成）"})
                elif chars < need:
                    gaps.append({"kind": "thin", "cluster": cl["id"], "keyword": k["kw"], "url": u,
                                 "priority": k["priority"] * cl["priority"],
                                 "detail": f"本文 {chars}字 / 目標 {need}字（拡充）"})
        gaps.sort(key=lambda g: (g["priority"], g["kind"] != "thin"))

    errors = [f for f in findings if f["level"] == "error"]
    warns = [f for f in findings if f["level"] == "warn"]
    result = {"date": date.today().isoformat(), "errors": errors, "warnings": warns,
              "gaps": gaps, "pages": len(all_pages)}

    if as_json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"# SEO 監査 {result['date']} — {len(all_pages)}ページ")
        print(f"\nerror {len(errors)}件 / warn {len(warns)}件\n")
        for lvl, items in (("ERROR", errors), ("WARN", warns)):
            if not items:
                continue
            print(f"## {lvl}")
            for f in items:
                print(f"- [{f['code']}] {f['page']} — {f['message']}")
            print()
        if gaps:
            print("## コンテンツギャップ（優先度順・上位10件）")
            for g in gaps[:10]:
                print(f"- ({g['priority']}) {g['keyword']} → {g['url']} : {g['detail']}")

    return 1 if (strict and errors) else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BrokenPipeError:
        # `| head` などで受け手が先に閉じただけ。set -o pipefail の CI を落とさない。
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        raise SystemExit(0)
