// 広告LPのユニットテスト。
// 実行: node --test lp-src/__tests__/
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { esc, imageSlot, jsonScript } from '../html.mjs'
import { renderPage, PAGES, siteUrl, imageSlotsOf, imagesBrief } from '../build.mjs'
import { IMAGE_BRIEFS } from '../config/imageBriefs.mjs'
import { lintPage, findClaim } from '../lint.mjs'
import { PRICING, CAMPAIGN, FORM_FEATURES, EVENTS, UTM_KEYS, CONTACT_API } from '../config/common.mjs'

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const rendered = new Map(PAGES.map((c) => [c.slug, renderPage(c)]))
/** @param {string} slug */
const page = (slug) => /** @type {string} */ (rendered.get(slug))

describe('html ユーティリティ', () => {
  it('HTML特殊文字をエスケープする', () => {
    assert.equal(esc('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;')
    assert.equal(esc("it's"), 'it&#39;s')
    assert.equal(esc(null), '')
  })

  it('jsonScript は </script> を無害化する', () => {
    assert.ok(!jsonScript({ a: '</script>' }).includes('</script>'))
  })

  it('画像スロットは比率・alt・未配置フォールバックを持つ', () => {
    const h = imageSlot({ src: '/images/lp/x/a.webp', alt: 'せつめい', ratio: '4 / 3', caption: 'キャプション' })
    assert.match(h, /--ratio:4 \/ 3/)
    assert.match(h, /alt="せつめい"/)
    // 画像が無いときに仮表示へ切り替わること
    assert.match(h, /onerror=/)
    assert.match(h, /is-missing/)
    assert.match(h, /\/images\/lp\/x\/a\.webp/)
  })
})

describe('料金表記', () => {
  const tokushoho = readFileSync(join(ROOT, 'tokushoho.html'), 'utf8')

  // 2026-09 の改定で「機能の数で決まるパック料金」は廃止され、
  // 「使う機能の月額を足す」方式になった。正本は moyo.tokyo の料金セクション。
  it('機能ごとの月額が改定後の金額', () => {
    assert.deepEqual(
      PRICING.features.map((f) => `${f.name} ${f.price}${f.unit}`),
      [
        'ブログ・口コミ対応 ¥2,980/月',
        'LINE会員証・クーポン ¥2,980/月',
        'スタッフサーベイ ¥2,980/店・月',
      ]
    )
  })

  it('サーベイの店舗数による逓減が正しい', () => {
    assert.deepEqual(
      PRICING.surveyTiers.map((t) => t.price),
      ['¥2,980', '¥2,480', '¥1,980', '¥1,480']
    )
  })

  it('電話の3段階と超過単価が正しい', () => {
    assert.deepEqual(
      PRICING.callTiers.map((t) => `${t.label} ${t.price}`),
      ['月10件まで ¥3,500', '月50件まで ¥5,000', '月200件まで ¥14,800']
    )
    assert.match(PRICING.callOverage, /¥100\/件/)
  })

  it('セット割の金額が単品合計と整合する', () => {
    // 単品合計 = ブログ2,980 + LINE2,980 + サーベイ1店2,980 + 電話
    assert.deepEqual(
      PRICING.bundles.map((b) => `${b.single} → ${b.price}`),
      ['単品合計 ¥13,940 → ¥11,800', '単品合計 ¥23,740 → ¥19,800']
    )
    assert.equal(2980 * 3 + 5000, 13940)
    assert.equal(2980 * 3 + 14800, 23740)
  })

  it('特商法ページが新料金と一致する', () => {
    // LP と法定表示がズレたまま公開されるのを防ぐ。片方だけ直すとここで落ちる。
    for (const amount of ['2,980円', '2,480円', '1,980円', '1,480円',
                          '3,500円', '5,000円', '14,800円', '11,800円', '19,800円']) {
      assert.ok(tokushoho.includes(amount), `特商法に ${amount} が無い`)
    }
    assert.ok(tokushoho.includes('739'), '特商法に 739円 が無い')
    assert.ok(tokushoho.includes('初期費用は0円'), '特商法の初期費用が0円になっていない')
  })

  it('特商法ページに旧パック料金が残っていない', () => {
    for (const old of ['機能 1つ', '機能 4つすべて', '13,000円', '15,000円']) {
      assert.ok(!tokushoho.includes(old), `旧料金の記述が残っている: ${old}`)
    }
  })
})

describe('生成された3ページ', () => {
  for (const cfg of PAGES) {
    describe(`/lp/${cfg.slug}/`, () => {
      const html = page(cfg.slug)

      it('固有の title と description を持つ', () => {
        assert.match(html, /<title>[^<]{10,}<\/title>/)
        assert.match(html, /<meta name="description" content="[^"]{30,}"/)
      })

      it('canonical が自分のURLを指す', () => {
        assert.ok(html.includes(`<link rel="canonical" href="${siteUrl()}/lp/${cfg.slug}/">`))
      })

      it('広告LPなので noindex,follow', () => {
        assert.match(html, /<meta name="robots" content="noindex,follow">/)
      })

      it('OGP が揃っている', () => {
        for (const p of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card']) {
          assert.ok(html.includes(`"${p}"`), `${p} が無い`)
        }
      })

      it('h1 はちょうど1つ', () => {
        assert.equal((html.match(/<h1[\s>]/g) || []).length, 1)
      })

      it('12セクションが規定の順で並ぶ', () => {
        const ids = ['hero', 'campaign', 'pain', 'solution', 'flow', 'usecase', 'features', 'trust', 'pricing', 'faq', 'apply', 'final']
        let cursor = -1
        for (const id of ids) {
          const at = html.indexOf(id === 'hero' ? 'class="hero"' : `id="${id}"`)
          assert.ok(at > cursor, `${id} の位置が不正`)
          cursor = at
        }
      })

      it('モバイル固定CTAがあり、フォームとフッターで退避する', () => {
        assert.match(html, /class="sticky"/)
        assert.ok((html.match(/data-cta-park/g) || []).length >= 2)
      })

      it('画像はすべて alt を持つ', () => {
        for (const img of html.match(/<img\b[^>]*>/g) || []) {
          assert.match(img, /\balt="[^"]+"/, `alt が無い: ${img}`)
        }
      })

      it('画像スロットは自分のLPのディレクトリを指す', () => {
        const srcs = [...html.matchAll(/\/images\/lp\/([a-z]+)\//g)].map((m) => m[1])
        assert.ok(srcs.length >= 7, `画像スロットが少ない (${srcs.length})`)
        for (const s of srcs) assert.equal(s, cfg.slug)
      })

      it('キャンペーン条件が載っている', () => {
        assert.ok(html.includes(CAMPAIGN.badge))
        assert.ok(html.includes(CAMPAIGN.headline))
        for (const t of CAMPAIGN.terms) assert.ok(html.includes(esc(t)), `条件が欠けている: ${t}`)
        for (const t of CAMPAIGN.billing.points) assert.ok(html.includes(esc(t)), `課金条件が欠けている: ${t}`)
      })

      it('lint に通る', () => {
        assert.deepEqual(lintPage(html, cfg.slug), [])
      })
    })
  }
})

describe('申込みフォーム', () => {
  const required = ['salonName', 'contactName', 'email', 'phone', 'salonCount', 'staffCount']

  for (const cfg of PAGES) {
    it(`${cfg.slug}: 必須項目がすべてある`, () => {
      const html = page(cfg.slug)
      for (const name of required) {
        assert.ok(html.includes(`name="${name}"`), `${name} が無い`)
        assert.ok(html.includes(`id="err-${name}"`), `${name} のエラー表示欄が無い`)
      }
      assert.ok(html.includes('name="consent"'), '同意チェックが無い')
      assert.ok(html.includes('name="features"'), '希望機能が無い')
    })

    it(`${cfg.slug}: 希望機能が「${cfg.presetFeature}」で初期選択される`, () => {
      const html = page(cfg.slug)
      const checked = [...html.matchAll(/name="features" value="([a-z]+)"[^>]*?( checked)?>/g)]
        .filter((m) => m[2])
        .map((m) => m[1])
      assert.deepEqual(checked, [cfg.presetFeature])
    })
  }

  it('4つのSKUすべてを選べる', () => {
    const html = page('call')
    for (const f of FORM_FEATURES) assert.ok(html.includes(`value="${f.value}"`), `${f.value} が無い`)
  })

  it('ハニーポットがあり、既存APIの website 項目と一致する', () => {
    assert.match(page('call'), /name="website"/)
  })

  it('送信先は既存の /api/contact', () => {
    assert.ok(page('call').includes(CONTACT_API))
    assert.match(CONTACT_API, /\/api\/contact$/)
  })

  it('利用規約・プライバシーポリシーへリンクしている', () => {
    const html = page('survey')
    assert.ok(html.includes('/terms.html'))
    assert.ok(html.includes('/privacy.html'))
  })
})

describe('計測', () => {
  const html = page('blog')

  it('6つのイベント名がすべて埋め込まれている', () => {
    const runtime = /window\.__MOYO_LP__ = (\{.*?\});/s.exec(html)
    assert.ok(runtime, 'ランタイム設定が無い')
    const cfg = JSON.parse(/** @type {string} */ (runtime[1]))
    assert.deepEqual(cfg.events, EVENTS)
    assert.deepEqual(cfg.utmKeys, [...UTM_KEYS])
    assert.equal(cfg.lp, 'blog')
  })

  it('UTM 5種を保持する', () => {
    assert.deepEqual([...UTM_KEYS], ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'])
  })

  it('CTA位置が識別できる', () => {
    const positions = [...html.matchAll(/data-cta="([a-z_]+)"/g)].map((m) => m[1])
    for (const p of ['header', 'hero', 'sticky', 'final', 'form_submit']) {
      assert.ok(positions.includes(p), `CTA位置 ${p} が無い`)
    }
  })

  it('初回流入URLを保持する仕組みがある', () => {
    assert.match(html, /landing_url/)
    assert.match(html, /moyo_lp_attr/)
  })

  it('Meta Pixel が未設定でもタグを出さない（表示が壊れない）', () => {
    assert.ok(!html.includes('connect.facebook.net'), 'ID未設定なのにピクセルを読み込んでいる')
    assert.match(html, /Meta Pixel: 未設定/)
  })

  it('個人情報をピクセルへ送らない', () => {
    const fbq = [...html.matchAll(/fbq\([^)]*\)/g)].map((m) => m[0]).join(' ')
    for (const pii of ['email', 'phone', 'contactName', 'salonName']) {
      assert.ok(!fbq.includes(pii), `${pii} をピクセルへ送っている`)
    }
  })

  it('PostHog は既存LPと同じプロジェクトを使う（二重導入しない）', () => {
    const index = readFileSync(join(ROOT, 'index.html'), 'utf8')
    const key = /posthog\.init\('([^']+)'/.exec(index)?.[1]
    assert.ok(key, '既存LPから PostHog キーを読めない')
    assert.ok(html.includes(key), '既存LPと別のPostHogプロジェクトを使っている')
  })
})

describe('lint 自体が機能する', () => {
  it('肯定形の禁止表現を検出する', () => {
    assert.ok(findClaim('MOYOが自動で投稿します。', /自動(的)?(で|に)?投稿(し(ます|てくれ|た)|でき(ます|る)|されます)/))
    assert.ok(findClaim('取りこぼしゼロを実現。', /取りこぼし(を)?ゼロ/))
  })

  it('否定・疑問での引用は見逃す', () => {
    assert.equal(findClaim('自動で投稿してくれますか？', /自動(的)?(で|に)?投稿(し(ます|てくれ|た)|でき(ます|る)|されます)/), null)
    assert.equal(findClaim('離職を予測するものではありません', /離職を予測/), null)
  })

  it('捏造数値を検出する', () => {
    const problems = lintPage('<html><h1>a</h1>離職が30%改善しました</html>', 'survey')
    assert.ok(problems.some((p) => p.rule === 'banned-claim'), '数値の捏造を検出できていない')
  })
})

describe('画像の制作指示', () => {
  const slotSrcs = PAGES.flatMap((c) => imageSlotsOf(c).map((s) => s.src))

  it('全21スロットに指示がある', () => {
    assert.equal(slotSrcs.length, 21)
    const missing = slotSrcs.filter((src) => !IMAGE_BRIEFS[src])
    assert.deepEqual(missing, [], `指示が無いスロット: ${missing.join(', ')}`)
  })

  it('使われていない指示が残っていない', () => {
    const orphan = Object.keys(IMAGE_BRIEFS).filter((src) => !slotSrcs.includes(src))
    assert.deepEqual(orphan, [], `対応するスロットが無い指示: ${orphan.join(', ')}`)
  })

  it('どの指示にも被写体・指示・避けることが揃っている', () => {
    for (const [src, b] of Object.entries(IMAGE_BRIEFS)) {
      assert.ok(b.subject && b.subject.length > 5, `${src}: 被写体が薄い`)
      assert.ok(b.detail.length >= 1, `${src}: 指示が無い`)
      assert.ok(b.avoid.length >= 1, `${src}: 避けることが無い`)
    }
  })

  it('指示書にファイル名・比率・altが載る', () => {
    const md = imagesBrief()
    for (const src of slotSrcs) assert.ok(md.includes(src), `${src} が指示書に無い`)
    assert.match(md, /9 \/ 19\.5（780×1690px 以上）/)
    assert.match(md, /全カット共通の条件/)
  })
})
