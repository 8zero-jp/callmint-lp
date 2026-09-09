#!/usr/bin/env node
/**
 * イラスト調アートワークを画像として書き出す。
 *
 *   npm i --no-save playwright-core        # 描画に Chromium を使う
 *   pip install pillow                     # WebP 変換・圧縮に使う
 *   node lp-src/art/render.mjs
 *
 * 書き出し先は images/lp/<slug>/<name>.webp（LPが参照するパスそのもの）。
 * 写真カット（ヒーロー等）はここでは作れない。images/lp/BRIEF.md を参照。
 *
 * フォント: ブランドの Zen Kaku Gothic New / Outfit がシステムに入っていること。
 * 入っていない場合は IPAGothic にフォールバックし、見た目が変わる。
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, unlinkSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

import { ARTWORKS } from './artworks.mjs'

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

/** 出力サイズは lp-src/config の比率に合わせる（README.md と一致させること） */
const SIZES = {
  'survey/anonymity.webp': { w: 1200, h: 900 },
  'blog/comparison.webp': { w: 1200, h: 900 },
  'survey/dashboard.webp': { w: 1200, h: 750 },
  'blog/generation-flow.webp': { w: 1200, h: 750 },
  'call/transcript.webp': { w: 1200, h: 750 },
  'blog/article-preview.webp': { w: 1200, h: 800 },
  'survey/flow-invite.webp': { w: 780, h: 1690 },
  'survey/mobile-response.webp': { w: 780, h: 1690 },
  'survey/flow-summary.webp': { w: 780, h: 1690 },
  'blog/flow-photo.webp': { w: 780, h: 1690 },
  'blog/flow-line-preview.webp': { w: 780, h: 1690 },
  'blog/flow-copy.webp': { w: 780, h: 1690 },
  'call/flow-incoming.webp': { w: 780, h: 1690 },
  'call/flow-intake.webp': { w: 780, h: 1690 },
  'call/flow-notify.webp': { w: 780, h: 1690 },
}

/** PNG を WebP へ。300KB を超えたら品質を落として収める。 */
function toWebp(png, out) {
  const py = `
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
for q in (88, 82, 76, 70, 62, 55):
    im.save(dst, 'WEBP', quality=q, method=6)
    import os
    if os.path.getsize(dst) <= 300 * 1024:
        print(q); break
else:
    print('55')
`
  return execFileSync('python3', ['-c', py, png, out], { encoding: 'utf8' }).trim()
}

const browser = await chromium.launch({ executablePath: CHROME })
let total = 0

for (const art of ARTWORKS) {
  const size = /** @type {Record<string, {w:number,h:number}>} */ (SIZES)[art.file]
  if (!size) throw new Error(`サイズ未定義: ${art.file}`)
  const { w: width, h: height } = size

  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.setContent(art.html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(120)

  const outPath = join(ROOT, 'images', 'lp', art.file)
  const tmpPng = outPath.replace(/\.webp$/, '.tmp.png')
  mkdirSync(dirname(outPath), { recursive: true })
  await page.screenshot({ path: tmpPng })
  await ctx.close()

  const q = toWebp(tmpPng, outPath)
  unlinkSync(tmpPng)

  const kb = statSync(outPath).size / 1024
  total += kb
  console.log(`  ${art.file.padEnd(30)} ${width}×${height}  ${kb.toFixed(0).padStart(4)} KB  (q=${q})`)
}

await browser.close()
console.log(`\n${ARTWORKS.length} 枚を書き出しました（合計 ${(total / 1024).toFixed(2)} MB）`)
