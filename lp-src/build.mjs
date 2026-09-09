#!/usr/bin/env node
/**
 * 広告LPのジェネレータ。
 *
 *   node lp-src/build.mjs           … lp/<slug>/index.html を書き出す
 *   node lp-src/build.mjs --check   … 書き出さず、コミット済みHTMLとの差分を検査する
 *
 * 3ページは同じ部品（lp-src/render.mjs）を使い、
 * 変わるのは lp-src/config/<slug>.mjs の文章・画像・機能説明だけ。
 *
 * ⚠️ 生成物（lp/**\/index.html）は手で編集しない。直すのは config か render。
 *    日次SEOエージェント（tools/seo_fix.py / seo_audit.py）は lp/ を対象外にしてある。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join as pathJoin } from 'node:path'
import { fileURLToPath } from 'node:url'

import { esc, jsonScript } from './html.mjs'
import { STYLES } from './styles.mjs'
import { CLIENT_JS } from './client.mjs'
import { body } from './render.mjs'
import {
  DEFAULT_SITE, CONTACT_API, POSTHOG, META_PIXEL_ID, CAMPAIGN, EVENTS, UTM_KEYS,
} from './config/common.mjs'

import { IMAGE_BRIEFS, COMMON_BRIEF } from './config/imageBriefs.mjs'
import survey from './config/survey.mjs'
import blog from './config/blog.mjs'
import call from './config/call.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
export const PAGES = [survey, blog, call]

/** 公開ドメインの正本は seo/keywords.json の "site"（既存のSEOツールと同じ扱い） */
export function siteUrl() {
  if (process.env.MOYO_SITE_URL) return process.env.MOYO_SITE_URL.replace(/\/+$/, '')
  try {
    const j = JSON.parse(readFileSync(pathJoin(ROOT, 'seo', 'keywords.json'), 'utf8'))
    if (typeof j.site === 'string' && j.site) return j.site.replace(/\/+$/, '')
  } catch { /* 読めなければ既定値 */ }
  return DEFAULT_SITE
}

/**
 * Meta Pixel。ID が空なら **タグを一切出さない**（未設定でも壊れない）。
 * @param {string} id
 */
function metaPixel(id) {
  if (!id) return '<!-- Meta Pixel: 未設定（META_PIXEL_ID が空のため読み込みません） -->'
  return `<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(id)});
fbq('track', 'PageView');
</script>`
}

/** @param {any} c */
export function renderPage(c) {
  const site = siteUrl()
  const url = `${site}/lp/${c.slug}/`
  const ogImage = `${site}${c.meta.ogImage}`

  const runtime = {
    lp: c.lp,
    lpTitle: c.meta.title,
    campaign: c.campaign,
    contactApi: CONTACT_API,
    submitLabel: c.ctaLabel,
    events: EVENTS,
    utmKeys: UTM_KEYS,
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(c.meta.title)}</title>
<meta name="description" content="${esc(c.meta.description)}">
<!-- 広告専用のLP。検索結果では本体ページ（/ と /blog/）を出したいので、
     このページ自体はインデックスさせない。リンクは辿らせる（follow）。 -->
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MOYO">
<meta property="og:locale" content="ja_JP">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(c.meta.title)}">
<meta property="og:description" content="${esc(c.meta.description)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(c.meta.title)}">
<meta name="twitter:description" content="${esc(c.meta.description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<meta name="theme-color" content="#6d4bf6">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="preload" as="image" href="${esc(c.images.hero.src)}" fetchpriority="high">
<style>${STYLES}</style>
<!-- PostHog（既存LPと同一プロジェクト。計測基盤は二重に入れない） -->
<script>
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="capture identify alias set_config".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||(window.posthog=[]));
posthog.init(${JSON.stringify(POSTHOG.key)}, {
  api_host: ${JSON.stringify(POSTHOG.host)},
  person_profiles: 'identified_only',
  capture_pageview: true
});
</script>
${metaPixel(META_PIXEL_ID)}
</head>
<body>
${body(c)}
<script>window.__MOYO_LP__ = ${jsonScript(runtime)};</script>
<script>${CLIENT_JS}</script>
</body>
</html>
`
}

/**
 * 各LPが必要とする画像スロットを設定から集める。
 * 人が手で一覧を書き写すと必ずズレるので、**設定が唯一の情報源**にする。
 * @param {any} c
 * @returns {{src:string,alt:string,ratio:string,caption:string,where:string}[]}
 */
export function imageSlotsOf(c) {
  return [
    { ...c.images.hero, where: 'ファーストビュー' },
    { ...c.images.solution, where: 'MOYOによる解決' },
    ...c.flow.steps.map((/** @type {any} */ s, /** @type {number} */ i) => ({
      ...s.image, ratio: '9 / 19.5', where: `利用フロー ${i + 1}（スマホ画面）`,
    })),
    { ...c.images.usecase, where: '実際の利用イメージ' },
    { ...c.images.trust, where: '安心材料' },
  ]
}

/** 必要画像の一覧を Markdown で書き出す（images/lp/README.md） */
export function imagesReadme() {
  const lines = [
    '# 広告LPの画像スロット',
    '',
    'このファイルは `npm run build:lp` が **自動生成** します。手で編集しないでください。',
    '一覧の正本は `lp-src/config/<slug>.mjs` です。',
    '',
    '## 使い方',
    '',
    '- 下表の**推奨ファイル名のとおりに** `.webp` を置くだけで反映されます。コードの変更は不要です。',
    '- 画像が無い間は、用途とファイル名を書いた仮表示になります。**レイアウトは崩れません**。',
    '- 比率は `aspect-ratio` で先に確保しているため、あとから画像を入れてもガタつきません（CLS対策）。',
    '- 横幅の目安: 通常のスロットは 1200px 以上、スマホ画面のスロットは 780px 以上。',
    '- alt テキストは設定済みです。差し替えは `lp-src/config/<slug>.mjs` で行ってください。',
    '',
  ]
  for (const c of PAGES) {
    lines.push(`## /lp/${c.slug}/ — ${c.meta.title.split('｜')[0]}`, '')
    lines.push('| 掲載位置 | ファイル名 | 推奨比率 | 推奨サイズ(px) | 用途 | alt |')
    lines.push('|---|---|---|---|---|---|')
    for (const s of imageSlotsOf(c)) {
      const [w, h] = s.ratio.split('/').map((/** @type {string} */ n) => Number(n.trim()))
      const width = (s.ratio === '9 / 19.5') ? 780 : 1200
      const height = Math.round((width * /** @type {number} */ (h)) / /** @type {number} */ (w))
      lines.push(`| ${s.where} | \`${s.src}\` | ${s.ratio} | ${width}×${height} | ${s.caption} | ${s.alt} |`)
    }
    lines.push('')
    lines.push(`OGP 画像: \`${c.meta.ogImage}\`（1200×630 推奨。上表のヒーロー画像と兼用しています）`)
    lines.push('')
  }
  return lines.join('\n')
}

/** 画像の制作指示を Markdown で書き出す（images/lp/BRIEF.md） */
export function imagesBrief() {
  const lines = [
    '# 広告LP 画像制作指示書',
    '',
    'このファイルは `npm run build:lp` が **自動生成** します。手で編集しないでください。',
    '内容の正本は `lp-src/config/imageBriefs.mjs`、スロットの定義は `lp-src/config/<slug>.mjs` です。',
    '',
    '全21カット。**うち15カット（イラスト調の画面・図解）は作成済み**で、',
    '`lp-src/art/` のソースから `node lp-src/art/render.mjs` で再生成できます。',
    '残る6カットは**写真**で、撮影またはストック写真の手配が必要です（下表の「要撮影」）。',
    '',
    '**指定のファイル名で `images/lp/<slug>/` に置くだけで反映されます**（コード変更は不要）。',
    '',
    `## ${COMMON_BRIEF.title}`,
    '',
  ]
  for (const [k, v] of COMMON_BRIEF.items) lines.push(`- **${k}**: ${v}`)
  lines.push('')

  for (const c of PAGES) {
    lines.push('---', '', `## /lp/${c.slug}/ — ${c.meta.title.split('｜')[0]}`, '')
    let i = 0
    for (const slot of imageSlotsOf(c)) {
      i += 1
      const b = IMAGE_BRIEFS[slot.src]
      const [w, h] = slot.ratio.split('/').map((/** @type {string} */ n) => Number(n.trim()))
      const width = slot.ratio === '9 / 19.5' ? 780 : 1200
      const height = Math.round((width * /** @type {number} */ (h)) / /** @type {number} */ (w))
      const badge = !b ? '' : b.status === 'photo' ? ' 🖼 **要撮影**' : ' ✅ 作成済み（イラスト）'
      lines.push(`### ${c.slug}-${i}. ${slot.where}${badge}`, '')
      lines.push(`- **ファイル名**: \`${slot.src}\``)
      lines.push(`- **比率 / サイズ**: ${slot.ratio}（${width}×${height}px 以上）`)
      lines.push(`- **alt テキスト**: ${slot.alt}`)
      if (b) {
        if (b.status === 'illustration') {
          lines.push('- **状態**: 作成済み。差し替えたい場合は `lp-src/art/artworks.mjs` を編集して再生成してください')
        } else {
          lines.push('- **状態**: 未作成。撮影またはストック写真が必要です')
        }
        lines.push(`- **被写体**: ${b.subject}`)
        lines.push('- **指示**:')
        for (const d of b.detail) lines.push(`  - ${d}`)
        lines.push('- **避けること**:')
        for (const a of b.avoid) lines.push(`  - ${a}`)
      } else {
        lines.push('- ⚠️ 制作指示が未定義です（lp-src/config/imageBriefs.mjs に追加してください）')
      }
      lines.push('')
    }
  }
  return lines.join('\n')
}

/** @param {any} c */
function outPath(c) {
  return pathJoin(ROOT, 'lp', c.slug, 'index.html')
}

function main() {
  const check = process.argv.includes('--check')
  let bad = 0

  for (const c of PAGES) {
    const html = renderPage(c)
    const file = outPath(c)
    if (check) {
      const current = existsSync(file) ? readFileSync(file, 'utf8') : null
      if (current !== html) {
        console.error(`✗ ${c.slug}: 生成物がソースと一致しません（npm run build:lp を実行してください）`)
        bad++
      } else {
        console.log(`✓ ${c.slug}: 一致`)
      }
      continue
    }
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, html)
    console.log(`書き出し: lp/${c.slug}/index.html (${(html.length / 1024).toFixed(1)} KB)`)
  }

  const docs = [
    { name: 'README.md', content: imagesReadme() },
    { name: 'BRIEF.md', content: imagesBrief() },
  ]
  for (const { name, content } of docs) {
    const docPath = pathJoin(ROOT, 'images', 'lp', name)
    if (check) {
      const current = existsSync(docPath) ? readFileSync(docPath, 'utf8') : null
      if (current !== content) {
        console.error(`✗ images/lp/${name} が設定と一致しません（npm run build:lp を実行してください）`)
        bad++
      } else {
        console.log(`✓ images/lp/${name}: 一致`)
      }
    } else {
      mkdirSync(dirname(docPath), { recursive: true })
      writeFileSync(docPath, content)
      console.log(`書き出し: images/lp/${name}`)
    }
  }

  if (bad > 0) process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()

export { CAMPAIGN }
