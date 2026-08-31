#!/usr/bin/env node
/**
 * 日次 SEO エージェント。
 *
 *   node tools/seo_daily.mjs            1件だけ着手して差分を残す
 *   node tools/seo_daily.mjs --dry-run  何をやるか出すだけ（API を叩かない）
 *
 * やること:
 *   1. tools/seo_fix.py で機械的な欠陥を直す
 *   2. tools/seo_audit.py --json でギャップを優先度順に取る
 *   3. Search Console があれば「11〜30位の伸ばせるKW」を優先度に反映する
 *   4. その日の最優先1件だけを Claude に投げて本文を書かせる
 *   5. もう一度 fix + audit --strict を通し、壊していないことを確かめる
 *   6. seo/log.json に記録（同じ所を毎日いじらないため）
 *
 * 1日1件に絞っているのは、まとめて大量生成すると質が落ちる上に
 * レビューできない差分になるため。積み上げは日数で作る。
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fetchSearchPerformance } from "./gsc.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE = "https://callmintai.com";
const LOG_PATH = path.join(ROOT, "seo", "log.json");
const DRY = process.argv.includes("--dry-run");

const MODEL_WRITE = process.env.SEO_MODEL_WRITE || "claude-sonnet-5";   // 本文
const MODEL_LIGHT = "claude-haiku-4-5-20251001";                       // タイトル短縮などの軽作業

const API_KEY = process.env.ANTHROPIC_API_KEY;

// ---------------------------------------------------------------- 小道具
const sh = (cmd, args) =>
  execFileSync(cmd, args, { cwd: ROOT, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });

const readJson = (p, fallback) => {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return fallback; }
};

const pageFile = (url) =>
  path.join(ROOT, url.endsWith("/") ? url.slice(1) + "index.html" : url.slice(1));

const visibleChars = (html) =>
  html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;

const today = () => new Date().toISOString().slice(0, 10);

async function claude({ model, system, user, tool, maxTokens = 16000 }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model, max_tokens: maxTokens, system,
      tools: [tool], tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const use = data.content?.find((c) => c.type === "tool_use");
  if (!use?.input) throw new Error("tool_use が返らなかった: " + JSON.stringify(data).slice(0, 500));
  return use.input;
}

// ---------------------------------------------------------------- ブランド前提
const BRAND = `
あなたは MOYO Call（サロン専門の AI 電話自動応答サービス／提供: 合同会社8ZERO）の
オウンドメディア編集者です。読者は日本のヘアサロン・ネイル・エステ・リラクゼーションの
オーナーと店長。ほとんどが1〜3店舗規模で、経営書は読まないが数字には敏感です。

書き方の約束:
- 事実として確認できないことを断定しない。統計や相場を出すときは「〜と言われる」
  「弊社の稼働店舗では」など、根拠の強さに応じた書き分けをする。数字の捏造は禁止。
- MOYO Call の宣伝は記事の最後だけ。本文は「MOYO を使わなくても実行できる打ち手」を
  先に、具体的に書く。売り込みが早い記事は読まれず、順位も付かない。
- competitor を実名で貶さない。比較は事実ベースで、自社に不利な点も書く。
- 一文は短く。「〜ではないでしょうか」のような曖昧な締めを避け、断定か問いで終える。
- 現場の具体（カラー剤塗布中、電話が3回鳴る、日曜17時、など）を必ず入れる。
  抽象論だけの段落は削る。
- 見出しは検索クエリの言い回しをそのまま含める（例:「美容室 電話 自動化」なら
  「美容室の電話を自動化する」）。ただし不自然な詰め込みはしない。

MOYO Call の事実（これ以外の仕様を勝手に作らない）:
- 月額 ¥5,480（Starter・月50件まで）／ ¥19,800（Growth・月200件まで）
- 既存の電話番号を転送設定するだけ。工事・機器・アプリ不要。最短即日
- 24時間365日、予約の受付・変更・キャンセル・よくある質問に応答
- 全通話をテキスト化して管理画面に記録。スタッフへ即時通知
- 14日間無料トライアル、クレジットカード不要
- デモ電話番号 050-1793-6450
`.trim();

// ---------------------------------------------------------------- 監査
function audit() {
  return JSON.parse(sh("python3", ["tools/seo_audit.py", "--json"]));
}

function applyDeterministicFixes() {
  const out = sh("python3", ["tools/seo_fix.py"]);
  process.stdout.write(out);
}

// ------------------------------------------------- 既存記事から使える CSS クラス
function availableClasses(html) {
  const inStyle = html.split("</style>")[0];
  return [...new Set([...inStyle.matchAll(/\.([a-z][a-z0-9-]+)\s*[,{ ]/g)].map((m) => m[1]))]
    .sort().join(", ");
}

// ---------------------------------------------------------------- 記事の拡充
const EXPAND_TOOL = {
  name: "submit_sections",
  description: "既存記事に追記する新しいセクションを提出する",
  input_schema: {
    type: "object",
    properties: {
      sections: {
        type: "array",
        description: "追記するセクション。既存の最終セクションの続き番号を使う。",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: 'アンカー id。既存の続きで "section8" のような形' },
            heading: { type: "string", description: "h2 の見出しテキスト（HTMLタグ不可）" },
            html: {
              type: "string",
              description:
                "h2 を除いた本文の HTML。使ってよいタグは p, ul, ol, li, strong, table, thead, tbody, tr, th, td, h3, blockquote と、" +
                "指示された既存 CSS クラスを付けた div のみ。table には class を付けない。style 属性・script・新しい class 名は禁止。",
            },
          },
          required: ["id", "heading", "html"],
        },
      },
      faq: {
        type: "array",
        description: "この記事の FAQPage 構造化データに追加する Q&A（0〜4件）",
        items: {
          type: "object",
          properties: { q: { type: "string" }, a: { type: "string" } },
          required: ["q", "a"],
        },
      },
      note: { type: "string", description: "何を足したかの1〜2文の要約（PR 本文に載る）" },
    },
    required: ["sections", "note"],
  },
};

async function expandArticle(gap, ctx) {
  const file = pageFile(gap.url);
  const html = fs.readFileSync(file, "utf-8");
  const bodyStart = html.indexOf('<article class="article-body">');
  const ctaStart = html.indexOf('<div class="cta-box">', bodyStart);
  if (bodyStart < 0 || ctaStart < 0) throw new Error(`本文の差し込み位置が見つからない: ${gap.url}`);

  const currentBody = html.slice(bodyStart, ctaStart);
  const lastSection = [...currentBody.matchAll(/id="section(\d+)"/g)].map((m) => +m[1]).pop() ?? 0;
  const need = gap.detail.match(/目標 (\d+)字/);
  const target = need ? +need[1] : 6000;
  const now = visibleChars(currentBody);

  const user = `
以下は既に公開している記事です。この記事を **検索クエリ「${gap.keyword}」で1位を取れる密度** まで
書き足してください。既存の本文は書き換えず、**続きのセクションだけ** を提出します。

- 現在の本文: 約 ${now}字 → 目標 約 ${target}字。つまり **${Math.max(1200, target - now)}字ぶん** 足りません。
- 追記セクション数の目安: ${Math.max(2, Math.ceil((target - now) / 1400))} 本
- 続き番号は section${lastSection + 1} から
- 既存セクションの焼き直しは禁止。検索者が知りたいのに **この記事にまだ無い** 論点を埋めること。
  具体的には: 手順（何から始めるか）、判断基準（自店はどれを選ぶべきか）、費用と回収、
  失敗パターン、業種差、導入後に実際に変わること、よくある誤解 などのうち欠けているもの。
- 比較・料金・チェックリストは素の <table>（class を付けない）で書く。ページ側に
  ベーススタイルが入っているので、class を足すとかえって崩れる。
- 使ってよい CSS クラス（既存のもののみ）: ${ctx.classes}

${ctx.gscHint}

--- 記事タイトル ---
${(html.match(/<title>(.*?)<\/title>/s) ?? [, ""])[1]}

--- 既存の本文（この続きを書く） ---
${currentBody.replace(/\s+/g, " ").slice(0, 12000)}
`.trim();

  const out = await claude({ model: MODEL_WRITE, system: BRAND, user, tool: EXPAND_TOOL, maxTokens: 20000 });

  const blocks = out.sections.map(
    (s) => `\n    <h2 id="${s.id}">${escapeText(s.heading)}</h2>\n${indent(s.html)}\n`
  ).join("");

  let next = html.slice(0, ctaStart) + blocks + "\n    " + html.slice(ctaStart);

  // 目次に追記
  next = next.replace(/(<div class="toc">[\s\S]*?<ol>[\s\S]*?)(\s*<\/ol>)/, (m, head, tail) => {
    const items = out.sections
      .map((s) => `\n        <li><a href="#${s.id}">${escapeText(s.heading)}</a></li>`).join("");
    return head + items + tail;
  });

  next = addFaq(next, out.faq ?? []);
  next = touchDateModified(next);
  fs.writeFileSync(file, next);

  return { file: path.relative(ROOT, file), note: out.note, sections: out.sections.length };
}

// ---------------------------------------------------------------- 記事の新規作成
const CREATE_TOOL = {
  name: "submit_article",
  description: "新しい記事を提出する",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "記事タイトル。ブランド名を含めず、全角24字以内。" },
      description: { type: "string", description: "meta description。全角80〜120字。" },
      h1: { type: "string", description: "本文の見出し。title と同じでよい。" },
      breadcrumb: { type: "string", description: "パンくずの末尾に出す短い名前（全角16字以内）" },
      tag: { type: "string", description: "カテゴリ名（例: 電話・AI活用 / 経営・数字 / 集客）" },
      lead: { type: "string", description: "リード文の HTML。<p> を2つ。" },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: '"section1" から連番' },
            heading: { type: "string" },
            html: { type: "string", description: "h2 を除いた本文 HTML。style/script/新 class 禁止。" },
          },
          required: ["id", "heading", "html"],
        },
      },
      faq: {
        type: "array",
        items: {
          type: "object",
          properties: { q: { type: "string" }, a: { type: "string" } },
          required: ["q", "a"],
        },
      },
      related: {
        type: "array",
        description: "関連記事として貼る既存記事の URL を3本",
        items: { type: "string" },
      },
      note: { type: "string" },
    },
    required: ["title", "description", "h1", "breadcrumb", "tag", "lead", "sections", "note"],
  },
};

async function createArticle(gap, ctx) {
  const slug = gap.url.replace(/^\/blog\/|\/$/g, "");
  const templatePath = path.join(ROOT, "blog", "salon-phone-complete-guide", "index.html");
  const tpl = fs.readFileSync(templatePath, "utf-8");

  const target = 6000;
  const user = `
検索クエリ「${gap.keyword}」で1位を取るための新規記事を書いてください。

- URL は ${SITE}${gap.url} になります
- 本文（タグを除いた可視テキスト）で **約 ${target}字**。セクションは5〜7本。
- 検索した人が最初の画面で答えに辿り着けること。結論を後出しにしない。
- 使ってよい CSS クラス（既存のもののみ）: ${ctx.classes}
- 関連記事に貼れる既存記事: ${ctx.existingArticles.join(", ")}

${ctx.gscHint}
`.trim();

  const a = await claude({ model: MODEL_WRITE, system: BRAND, user, tool: CREATE_TOOL, maxTokens: 20000 });

  const bodyHtml =
    a.lead + "\n" +
    `    <div class="toc">\n      <div class="toc-title">目次</div>\n      <ol>` +
    a.sections.map((s) => `\n        <li><a href="#${s.id}">${escapeText(s.heading)}</a></li>`).join("") +
    `\n      </ol>\n    </div>\n` +
    a.sections.map((s) => `\n    <h2 id="${s.id}">${escapeText(s.heading)}</h2>\n${indent(s.html)}\n`).join("");

  const html = renderFromTemplate(tpl, { slug, url: gap.url, article: a, bodyHtml });
  const dir = path.join(ROOT, "blog", slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);

  linkFromBlogIndex(slug, a);

  return { file: `blog/${slug}/index.html`, note: a.note, sections: a.sections.length, created: true };
}

function renderFromTemplate(tpl, { slug, url, article: a, bodyHtml }) {
  const full = SITE + url;
  const d = today();
  let s = tpl;

  s = s.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeText(a.title)}｜MOYO</title>`);
  s = s.replace(/<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${escapeAttr(a.description)}">`);
  s = s.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${full}">`);
  s = s.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${full}">`);
  s = s.replace(/<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${escapeAttr(a.title)}">`);
  s = s.replace(/<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${escapeAttr(a.description)}">`);
  s = s.replace(/<meta name="twitter:title" content="[^"]*">/,
    `<meta name="twitter:title" content="${escapeAttr(a.title)}">`);
  s = s.replace(/<meta name="twitter:description" content="[^"]*">/,
    `<meta name="twitter:description" content="${escapeAttr(a.description)}">`);
  s = s.replace(/(og:image|twitter:image)" content="[^"]*"/g, `$1" content="${SITE}/images/og-image.png"`);
  // テンプレート由来のヒーロー画像 preload と img は新記事には無いので落とす
  s = s.replace(/<link rel="preload" as="image" href="hero\.webp"[^>]*>\n?/, "");
  s = s.replace(/\s*<img src="hero\.webp"[^>]*>\n?/, "\n");

  // 構造化データを丸ごと差し替える
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    image: `${SITE}/images/og-image.png`,
    datePublished: d,
    dateModified: d,
    author: { "@type": "Organization", name: "MOYO Call" },
    publisher: { "@type": "Organization", name: "MOYO Call", url: SITE },
    mainEntityOfPage: { "@type": "WebPage", "@id": full },
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "ブログ", item: SITE + "/blog/" },
      { "@type": "ListItem", position: 3, name: a.breadcrumb, item: full },
    ],
  };
  const blocks = [ld, crumbs];
  if (a.faq?.length) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: a.faq.map((f) => ({
        "@type": "Question", name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  const ldHtml = blocks
    .map((b) => `<script type="application/ld+json">\n${JSON.stringify(b, null, 2)}\n</script>`)
    .join("\n");
  s = s.replace(/<script type="application\/ld\+json">[\s\S]*<\/script>\s*(?=<style>)/, ldHtml + "\n");

  // パンくず・見出し・メタ
  s = s.replace(/(<nav class="breadcrumb"[\s\S]*?<span>)[\s\S]*?(<\/span>)/,
    `$1${escapeText(a.breadcrumb)}$2`);
  s = s.replace(/<span class="article-tag">[\s\S]*?<\/span>/,
    `<span class="article-tag">${escapeText(a.tag)}</span>`);
  s = s.replace(/<h1>[\s\S]*?<\/h1>/, `<h1>${escapeText(a.h1)}</h1>`);
  s = s.replace(/<span>📅[\s\S]*?<\/span>/,
    `<span>📅 ${d.replace(/(\d+)-(\d+)-(\d+)/, (_, y, m, dd) => `${y}年${+m}月${+dd}日`)}</span>`);

  // 本文を差し替える
  const start = s.indexOf('<article class="article-body">');
  const cta = s.indexOf('<div class="cta-box">', start);
  s = s.slice(0, start) + '<article class="article-body">\n\n' + indent(bodyHtml) + "\n\n    " + s.slice(cta);

  // 関連記事
  if (a.related?.length) {
    s = s.replace(/(<div class="related-grid">)[\s\S]*?(<\/div>\s*<\/div>)/, (m, open, close) => {
      const cards = a.related.slice(0, 3).map((u) =>
        `\n        <a href="${u}" class="related-card">\n` +
        `          <div class="related-card-emoji">📞</div>\n` +
        `          <div class="related-card-title">${escapeText(u.replace(/^\/blog\/|\/$/g, ""))}</div>\n` +
        `          <div class="related-card-arrow">→</div>\n        </a>`).join("");
      return open + cards + "\n      " + close;
    });
  }
  return s;
}

function linkFromBlogIndex(slug, a) {
  const p = path.join(ROOT, "blog", "index.html");
  let s = fs.readFileSync(p, "utf-8");
  if (s.includes(`/blog/${slug}/`)) return;
  const m = s.match(/<a href="\/blog\/[^"]+\/" class="article-card">[\s\S]*?<\/a>/);
  if (!m) return;
  const card = m[0]
    .replace(/href="\/blog\/[^"]+\/"/, `href="/blog/${slug}/"`)
    .replace(/<h2 class="article-card-title">[\s\S]*?<\/h2>/, `<h2 class="article-card-title">${escapeText(a.title)}</h2>`)
    .replace(/(<p class="article-card-excerpt">)[\s\S]*?(<\/p>)/, `$1${escapeText(a.description)}$2`)
    .replace(/\s*<img[^>]*>/, "");
  s = s.slice(0, m.index) + card + "\n      " + s.slice(m.index);
  fs.writeFileSync(p, s);
}

// ---------------------------------------------------------------- タイトル短縮
const TITLE_TOOL = {
  name: "submit_titles",
  description: "検索結果で切れないタイトルを提出する",
  input_schema: {
    type: "object",
    properties: {
      titles: {
        type: "array",
        items: {
          type: "object",
          properties: {
            url: { type: "string" },
            title: { type: "string", description: "「｜MOYO」を含めて全角35字以内" },
          },
          required: ["url", "title"],
        },
      },
    },
    required: ["titles"],
  },
};

async function shortenTitles(warnings) {
  const targets = warnings.filter((w) => w.code === "title-long").slice(0, 10);
  if (!targets.length) return null;

  const list = targets.map((w) => {
    const f = pageFile(w.page);
    const t = fs.readFileSync(f, "utf-8").match(/<title>(.*?)<\/title>/s)[1];
    return `${w.page}\t${t}`;
  }).join("\n");

  const out = await claude({
    model: MODEL_LIGHT, system: BRAND, maxTokens: 3000, tool: TITLE_TOOL,
    user: `以下のタイトルは日本語検索結果（全角30〜35字で切れる）で末尾が欠けています。
狙っているクエリの語をタイトル前半に残したまま、「｜MOYO」込みで **全角35字以内** に詰めてください。
記事の中身を変えるわけではないので、意味は変えないこと。

URL\tタイトル
${list}`,
  });

  let n = 0;
  for (const t of out.titles) {
    const f = pageFile(t.url);
    if (!fs.existsSync(f)) continue;
    const s = fs.readFileSync(f, "utf-8");
    const before = s.match(/<title>(.*?)<\/title>/s)[1];
    const chars = [...t.title].length;

    // 途中で切っただけのタイトルを弾く。文が途切れると CTR が落ちる上に、
    // ブランド名まで消えることがある。
    const truncated = before.startsWith(t.title) || !t.title.includes("MOYO");
    if (chars > 35 || chars < 12 || truncated) {
      console.log(`  title 却下: ${t.url}（${chars}字 / ${truncated ? "切り詰めかブランド欠落" : "字数"}）`);
      continue;
    }
    fs.writeFileSync(f, s.replace(/<title>.*?<\/title>/s, `<title>${escapeText(t.title)}</title>`));
    n++;
  }
  return n ? `title を ${n}本 短縮` : null;
}

// ---------------------------------------------------------------- HTML 小道具
const escapeText = (s) => String(s).replace(/&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s) => escapeText(s).replace(/"/g, "&quot;");
const indent = (html) => html.split("\n").map((l) => (l.trim() ? "    " + l.trim() : "")).join("\n");

function touchDateModified(html) {
  return html.replace(/"dateModified": *"[^"]*"/, `"dateModified": "${today()}"`);
}

function addFaq(html, faq) {
  if (!faq.length) return html;
  const entries = faq.map((f) => ({
    "@type": "Question", name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  }));

  // ld+json は1ページに複数ある。正規表現で1つに狙いを付けると隣のブロックを
  // 巻き込むので、1つずつ parse して FAQPage のものだけを差し替える。
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    let obj;
    try { obj = JSON.parse(m[1]); } catch { continue; }
    if (obj?.["@type"] !== "FAQPage" || !Array.isArray(obj.mainEntity)) continue;
    const have = new Set(obj.mainEntity.map((q) => q.name));
    obj.mainEntity.push(...entries.filter((e) => !have.has(e.name)));
    return html.slice(0, m.index) +
      `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>` +
      html.slice(m.index + m[0].length);
  }

  const block = `<script type="application/ld+json">\n${JSON.stringify(
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: entries }, null, 2)}\n</script>\n`;
  return html.replace("<style>", block + "<style>");
}

// ---------------------------------------------------------------- 優先度づけ
function prioritize(gaps, gsc, log) {
  const recent = new Set(
    (log.history ?? []).filter((h) => (Date.now() - Date.parse(h.date)) < 14 * 86400_000)
      .map((h) => h.url)
  );

  return gaps
    .map((g) => {
      let score = g.priority;
      // Search Console で「あと一押し」に入っている URL は最優先
      const hit = gsc?.striking?.find((r) => r.page.replace(SITE, "") === g.url);
      if (hit) score -= 2;
      // 直近2週間で触った所は後回し（同じ記事を毎日いじらない）
      if (recent.has(g.url)) score += 100;
      return { ...g, score, gscPosition: hit?.position };
    })
    .sort((a, b) => a.score - b.score);
}

// ---------------------------------------------------------------- 本体
async function main() {
  console.log(`== MOYO 日次SEO ${today()} ==\n`);

  console.log("[1/5] 機械的な修正");
  applyDeterministicFixes();

  console.log("\n[2/5] 監査");
  let a = audit();
  console.log(`  error ${a.errors.length} / warn ${a.warnings.length} / ギャップ ${a.gaps.length}`);
  for (const e of a.errors) console.log(`  ERROR [${e.code}] ${e.page} — ${e.message}`);

  console.log("\n[3/5] Search Console");
  let gsc = null;
  try {
    gsc = await fetchSearchPerformance();
    if (!gsc) console.log("  未設定（GSC_SERVICE_ACCOUNT_JSON / GSC_SITE_URL）。サイト側の欠陥のみで判断する");
    else console.log(`  ${gsc.rows.length}クエリ / あと一押し(11〜30位) ${gsc.striking.length}件`);
  } catch (e) {
    console.log("  取得失敗（無視して続行）:", e.message);
  }

  const log = readJson(LOG_PATH, { history: [] });
  const ranked = prioritize(a.gaps, gsc, log);

  if (!ranked.length) {
    console.log("\n着手すべきギャップなし。技術SEOの修正だけを残す。");
    return finish(log, null, a, gsc);
  }

  const pick = ranked[0];
  console.log(`\n[4/5] 本日の対象: [${pick.kind}] ${pick.keyword} → ${pick.url}`);
  console.log(`  ${pick.detail}${pick.gscPosition ? `（現在 ${pick.gscPosition.toFixed(1)}位）` : ""}`);

  if (DRY) { console.log("\n--dry-run のためここで終了"); return; }
  if (!API_KEY) throw new Error("ANTHROPIC_API_KEY が無い");

  const sample = fs.readFileSync(
    path.join(ROOT, "blog", "salon-phone-complete-guide", "index.html"), "utf-8");
  const ctx = {
    classes: availableClasses(sample),
    existingArticles: fs.readdirSync(path.join(ROOT, "blog"), { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => `/blog/${d.name}/`),
    gscHint: gsc?.striking?.length
      ? `参考: Search Console 上で、この記事は次のクエリで表示されているのに 11〜30位で止まっています。
これらの語に対する答えを本文に入れてください:
${gsc.striking.filter((r) => r.page.replace(SITE, "") === pick.url)
        .map((r) => `- ${r.query}（${r.position.toFixed(1)}位・表示 ${r.impressions}回）`).join("\n") || "（この記事については該当なし）"}`
      : "",
  };

  const result = pick.kind === "missing-page"
    ? await createArticle(pick, ctx)
    : await expandArticle(pick, ctx);

  console.log(`  → ${result.file} に ${result.sections} セクション追記`);

  const titleNote = await shortenTitles(a.warnings).catch((e) => {
    console.log("  title 短縮は失敗（無視）:", e.message);
    return null;
  });
  if (titleNote) console.log(`  → ${titleNote}`);

  console.log("\n[5/5] 再検査");
  applyDeterministicFixes();
  a = audit();
  console.log(`  error ${a.errors.length} / warn ${a.warnings.length}`);
  if (a.errors.length) {
    for (const e of a.errors) console.log(`  ERROR [${e.code}] ${e.page} — ${e.message}`);
    throw new Error("生成物が監査を通らなかった。差分は捨てる。");
  }

  finish(log, { ...result, ...pick, titleNote }, a, gsc);
}

function finish(log, work, a, gsc) {
  log.history = [
    ...(log.history ?? []),
    {
      date: today(),
      url: work?.url ?? null,
      keyword: work?.keyword ?? null,
      kind: work?.kind ?? "fix-only",
      note: work?.note ?? "技術SEOの修正のみ",
      titleNote: work?.titleNote ?? null,
      errorsAfter: a.errors.length,
      warningsAfter: a.warnings.length,
      gscTracked: !!gsc,
    },
  ].slice(-180);
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + "\n");

  // ワークフローが PR 本文に使う
  const summary = work
    ? `**${work.keyword ?? ""}** 向けに \`${work.url}\` を更新（${work.kind}）\n\n${work.note}` +
      (work.titleNote ? `\n\nあわせて ${work.titleNote}。` : "")
    : "本日はコンテンツのギャップなし。機械的な技術SEO修正のみ。";
  fs.writeFileSync(path.join(ROOT, "seo", ".pr-body.md"),
    `${summary}\n\n---\n監査結果: error ${a.errors.length}件 / warn ${a.warnings.length}件\n` +
    (gsc ? "" : "\n> Search Console が未接続のため、順位ではなくサイト側の欠陥だけで対象を選んでいます。\n"));
}

main().catch((e) => { console.error("\n失敗:", e.message); process.exit(1); });
