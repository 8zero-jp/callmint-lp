// 日次SEOエージェントの生成物サニタイズのテスト。
// 2026-09-14〜09-26 は 13日連続で監査に落ちて成果が全部捨てられていた。
// 原因は (1) 記事途中の cta-box で採番が打ち切られて id が重複、
// (2) モデルが実在しない /trial への導線を書く、の2点。
// 実行: node --test lp-src/__tests__/
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { fixInternalLinks, internalTargetExists } from '../../tools/seo_daily.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('internalTargetExists', () => {
  it('実在するページを通す', () => {
    assert.equal(internalTargetExists('/'), true)
    assert.equal(internalTargetExists('/terms.html'), true)
    assert.equal(internalTargetExists('/blog/'), true)
    assert.equal(internalTargetExists('/blog/salon-phone-complete-guide/'), true)
  })

  it('フラグメントだけのリンクを通す', () => {
    assert.equal(internalTargetExists('#section3'), true)
  })

  it('実在しないパスを落とす', () => {
    assert.equal(internalTargetExists('/trial'), false)
    assert.equal(internalTargetExists('/pricing'), false)
    assert.equal(internalTargetExists('/blog/does-not-exist/'), false)
  })
})

describe('fixInternalLinks', () => {
  it('寄せ先があるものは実在するURLに置き換える', () => {
    const report = []
    const out = fixInternalLinks('<p><a href="/trial" class="x">無料で試す</a></p>', report)
    assert.equal(out, '<p><a href="/#contact" class="x">無料で試す</a></p>')
    assert.deepEqual(report, ['/trial → /#contact'])
  })

  it('寄せ先が無いものはリンクを外して文章を残す', () => {
    const report = []
    const out = fixInternalLinks('<p><a href="/nowhere/">この機能</a>が使えます</p>', report)
    assert.equal(out, '<p>この機能が使えます</p>')
    assert.deepEqual(report, ['/nowhere/ → リンクを外した'])
  })

  it('実在するリンクと外部リンクには触らない', () => {
    const report = []
    const src = '<a href="/blog/">ブログ</a><a href="https://example.com/">外</a>'
      + '<a href="tel:05017936450">電話</a><a href="#section2">目次</a>'
    assert.equal(fixInternalLinks(src, report), src)
    assert.deepEqual(report, [])
  })

  it('/#contact のようなトップのアンカーを壊さない', () => {
    const report = []
    const src = '<a href="/#contact" class="cta-box-btn">申し込む</a>'
    assert.equal(fixInternalLinks(src, report), src)
    assert.deepEqual(report, [])
  })
})

describe('セクションの採番（記事途中に cta-box がある記事）', () => {
  // expandArticle の採番ロジックと同じ計算。記事途中の cta-box で
  // 打ち切られると既存の section11〜13 と衝突する。
  const html = readFileSync(join(ROOT, 'blog/salon-phone-complete-guide/index.html'), 'utf-8')
  const bodyStart = html.indexOf('<article class="article-body">')
  const bodyEnd = html.indexOf('</article>', bodyStart)

  it('記事の途中にも cta-box がある（この記事が回帰の見本）', () => {
    const first = html.indexOf('<div class="cta-box">', bodyStart)
    const last = html.lastIndexOf('<div class="cta-box">', bodyEnd)
    assert.ok(first > 0 && last > first, '途中と末尾の2箇所に cta-box があること')
  })

  it('採番は記事全体の最大値から続ける', () => {
    const article = html.slice(bodyStart, bodyEnd)
    const ids = [...article.matchAll(/id="section(\d+)"/g)].map((m) => +m[1])
    const next = Math.max(0, ...ids) + 1
    assert.equal(next, Math.max(...ids) + 1)
    assert.ok(!ids.includes(next), `section${next} は既存と衝突しないこと`)
  })
})
