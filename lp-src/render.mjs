/**
 * 3つの広告LPが共有するセクション部品。
 * ページごとに変わるのは **文章・画像・機能説明だけ**（lp-src/config/*.mjs）。
 *
 * セクションの並びは全LP共通:
 *   1 ファーストビュー / 2 キャンペーン / 3 悩み / 4 解決 / 5 利用フロー /
 *   6 利用イメージ / 7 主な機能 / 8 安心材料 / 9 料金 / 10 FAQ / 11 フォーム / 12 最終CTA
 */
import { esc, join, imageSlot, phoneMock } from './html.mjs'
import {
  CAMPAIGN, PRICING, FORM_FEATURES, SALON_COUNT_OPTIONS, STAFF_COUNT_OPTIONS,
  FOOTER_LINKS, COMPANY,
} from './config/common.mjs'

/** @typedef {import('./config/common.mjs')} _C */

/** @param {{href:string,label:string,cta:string,primary?:boolean}} o */
function cta(o) {
  const cls = o.primary === false ? 'btn btn--ghost' : 'btn btn--primary'
  return `<a href="${esc(o.href)}" class="${cls}" data-cta="${esc(o.cta)}">${esc(o.label)}</a>`
}

/* ── 1. ファーストビュー ───────────────────────── */
/** @param {any} c */
export function heroSection(c) {
  return `<section class="hero">
  <div class="wrap">
    <div class="hero-grid">
      <div>
        <p class="hero-badge">${esc(CAMPAIGN.badge)}</p>
        <h1>${c.hero.title}</h1>
        <p class="hero-sub">${esc(c.hero.sub)}</p>
        <div class="hero-actions">
          ${cta({ href: '#apply', label: c.ctaLabel, cta: 'hero' })}
          ${cta({ href: '#campaign', label: 'キャンペーンを見る', cta: 'hero_secondary', primary: false })}
        </div>
        <p class="btn-note">お申し込みフォームの送信だけでは料金は発生しません</p>
      </div>
      <div class="hero-media">
        ${imageSlot({ ...c.images.hero, priority: true })}
      </div>
    </div>
  </div>
</section>`
}

/* ── 2. 9月限定キャンペーン ───────────────────── */
export function campaignSection() {
  return `<section class="section" id="campaign">
  <div class="wrap">
    <div class="camp">
      <p class="camp-badge">${esc(CAMPAIGN.badge)}</p>
      <h2>${esc(CAMPAIGN.headline)}</h2>
      <p class="camp-sub">パイロット店舗として、一緒に使い方を育ててくださる店舗を募集しています。</p>
      <ul class="camp-terms">
        ${CAMPAIGN.terms.map((t) => `<li>${esc(t)}</li>`).join('\n        ')}
      </ul>
    </div>
    <div class="billing">
      <h3>${esc(CAMPAIGN.billing.title)}</h3>
      <ul>
        ${CAMPAIGN.billing.points.map((t) => `<li>${esc(t)}</li>`).join('\n        ')}
      </ul>
    </div>
  </div>
</section>`
}

/* ── 3. 悩み ─────────────────────────────────── */
/** @param {any} c */
export function painSection(c) {
  return `<section class="section section--tint" id="pain">
  <div class="wrap">
    <p class="eyebrow">${esc(c.pain.eyebrow)}</p>
    <h2 class="h2">${c.pain.title}</h2>
    <p class="lead">${esc(c.pain.lead)}</p>
    <div class="pain">
      ${c.pain.items.map((/** @type {string} */ t, /** @type {number} */ i) =>
        `<div class="pain-item"><span class="pain-icon en">0${i + 1}</span><p>${esc(t)}</p></div>`
      ).join('\n      ')}
    </div>
  </div>
</section>`
}

/* ── 4. MOYOによる解決 ───────────────────────── */
/** @param {any} c */
export function solutionSection(c) {
  return `<section class="section" id="solution">
  <div class="wrap">
    <p class="eyebrow">Solution</p>
    <h2 class="h2">${c.solution.title}</h2>
    <p class="lead">${esc(c.solution.lead)}</p>
    <div class="stack--lg stack">
      ${imageSlot(c.images.solution)}
      <div class="sol">
        ${c.solution.items.map((/** @type {{title:string,body:string}} */ it) =>
          `<div class="sol-item"><h3>${esc(it.title)}</h3><p>${esc(it.body)}</p></div>`
        ).join('\n        ')}
      </div>
    </div>
  </div>
</section>`
}

/* ── 5. スマホ画面中心の利用フロー ─────────────── */
/** @param {any} c */
export function flowSection(c) {
  return `<section class="section section--soft" id="flow">
  <div class="wrap">
    <p class="eyebrow">How it works</p>
    <h2 class="h2">${c.flow.title}</h2>
    <p class="lead">${esc(c.flow.lead)}</p>
    <div class="flow">
      ${c.flow.steps.map((/** @type {any} */ s, /** @type {number} */ i) => `<div class="flow-step">
        <span class="flow-num en">${i + 1}</span>
        ${phoneMock({ src: s.image.src, alt: s.image.alt, caption: s.image.caption })}
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.body)}</p>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

/* ── 6. 実際の利用イメージ ───────────────────── */
/** @param {any} c */
export function usecaseSection(c) {
  return `<section class="section" id="usecase">
  <div class="wrap">
    <p class="eyebrow">Use case</p>
    <h2 class="h2">${c.usecase.title}</h2>
    <p class="lead">${esc(c.usecase.lead)}</p>
    <div class="stack--lg stack">
      ${imageSlot(c.images.usecase)}
      <div class="card">
        <div class="stack">
          ${c.usecase.points.map((/** @type {string} */ t) => `<p>${esc(t)}</p>`).join('\n          ')}
        </div>
      </div>
    </div>
  </div>
</section>`
}

/* ── 7. 主な機能 ─────────────────────────────── */
/** @param {any} c */
export function featureSection(c) {
  return `<section class="section section--tint" id="features">
  <div class="wrap">
    <p class="eyebrow">Features</p>
    <h2 class="h2">${c.features.title}</h2>
    <p class="lead">${esc(c.features.lead)}</p>
    <div class="feat">
      ${c.features.items.map((/** @type {{title:string,body:string}} */ it) =>
        `<div class="feat-item"><h3>${esc(it.title)}</h3><p>${esc(it.body)}</p></div>`
      ).join('\n      ')}
    </div>
  </div>
</section>`
}

/* ── 8. 安心材料 ─────────────────────────────── */
/** @param {any} c */
export function trustSection(c) {
  return `<section class="section" id="trust">
  <div class="wrap">
    <p class="eyebrow">Trust</p>
    <h2 class="h2">${c.trust.title}</h2>
    <p class="lead">${esc(c.trust.lead)}</p>
    ${imageSlot(c.images.trust)}
    <div class="trust" style="margin-top:18px">
      ${c.trust.items.map((/** @type {{title:string,body:string}} */ it) =>
        `<div class="trust-item"><h3>${esc(it.title)}</h3><p>${esc(it.body)}</p></div>`
      ).join('\n      ')}
    </div>
  </div>
</section>`
}

/* ── 9. 料金とキャンペーン条件 ─────────────────
   金額の正本は moyo.tokyo の料金セクション（2026-09 改定）。
   「機能ごとの月額を足す」方式で、電話だけ月の通話件数で決まる。 */
/** @param {any} c */
export function pricingSection(c) {
  const row = (/** @type {string} */ th, /** @type {string} */ amt, /** @type {string} */ note = '') =>
    `<tr><th>${esc(th)}</th><td><span class="amt">${esc(amt)}</span>${
      note ? `<span class="note">${esc(note)}</span>` : ''}</td></tr>`

  /** そのLPが主役にしている機能の料金を最初に見せる */
  const ownPrice = () => {
    if (c.lp === 'call') {
      return `<div class="price-card">
      <h3>AI電話対応</h3>
      <p>月の通話件数で決まります。${esc(PRICING.callOverage)}</p>
      <table class="ptable"><tbody>
        ${PRICING.callTiers.map((t) =>
          row(`${t.name}（${t.label}）`, `${t.price} /月`, t.per)).join('\n        ')}
      </tbody></table>
    </div>`
    }
    if (c.lp === 'survey') {
      return `<div class="price-card">
      <h3>スタッフサーベイ</h3>
      <p>1店舗あたりの月額です。店舗が増えるほど1店舗あたりの単価が下がります。</p>
      <table class="ptable"><tbody>
        ${PRICING.surveyTiers.map((t) => row(t.label, `${t.price} /店・月`)).join('\n        ')}
      </tbody></table>
    </div>`
    }
    return `<div class="price-card">
      <h3>ブログ・口コミ対応</h3>
      <p>ブログの下書き作成とクチコミ返信案がこの1つに含まれます。</p>
      <table class="ptable"><tbody>
        ${row('月額', '¥2,980 /月')}
      </tbody></table>
    </div>`
  }

  /** ほかの機能を足すときの一覧（自分の機能は上で出しているので除く） */
  const others = PRICING.features.filter((f) => f.key !== c.lp)
  const otherRows = others.map((f) => row(f.name, `${f.price} ${f.unit}`)).join('\n        ')
  const callRow = c.lp === 'call' ? '' : row('AI電話対応', '¥3,500〜 /月', '月の通話件数で決まります')

  // 電話の実費は、電話LPでは常に。ほかのLPでは電話を足したときだけ関係する。
  const costHeading = c.lp === 'call'
    ? '電話まわりの実費（無料期間中もかかります）'
    : '電話を追加した場合の実費（無料期間中もかかります）'

  return `<section class="section section--tint" id="pricing">
  <div class="wrap">
    <p class="eyebrow">Pricing</p>
    <h2 class="h2">料金とキャンペーン条件</h2>
    <p class="lead">${esc(PRICING.note)}キャンペーン期間中に無料になるのは<strong>この月額</strong>です。実費は分けて記載しています。</p>

    <div class="price-free">
      <strong>${esc(CAMPAIGN.headline)}（${esc(CAMPAIGN.badge)}）</strong><br>
      ご利用開始日から3ヶ月間、月額が0円になります。初期費用も0円です。4ヶ月目から下記の通常料金です。
    </div>

    ${ownPrice()}

    <div class="price-card">
      <h3>ほかの機能を足す場合</h3>
      <p>使う機能の月額を足すだけです。</p>
      <table class="ptable"><tbody>
        ${otherRows}
        ${callRow}
      </tbody></table>
    </div>

    <div class="price-card">
      <h3>4つすべてを使う場合（セット割）</h3>
      <p>単品の合計より安くなります。</p>
      <table class="ptable"><tbody>
        ${PRICING.bundles.map((b) =>
          row(`${b.name}（${b.detail}）`, `${b.price} /月`, `${b.single} から ${b.off}`)).join('\n        ')}
      </tbody></table>
      <p class="fineprint">${esc(PRICING.bundleNote)}</p>
    </div>

    <div class="price-card">
      <h3>${esc(costHeading)}</h3>
      <p>下記は月額とは別の実費です。3ヶ月無料の対象には含まれません。</p>
      <table class="ptable"><tbody>
        ${PRICING.callActualCosts.map((t) => row(t.label, t.price, t.note)).join('\n        ')}
      </tbody></table>
    </div>

    <p class="fineprint">
      ${esc(PRICING.initialNote)}<br>
      ${esc(PRICING.taxNote)}<br>
      最低契約期間はありません。解約のお申し出をいただいた場合、次回請求分以降を停止します。<br>
      料金の詳細は<a href="/tokushoho.html">特定商取引法に基づく表記</a>をご確認ください。
    </p>
  </div>
</section>`
}

/* ── 10. よくある質問 ───────────────────────── */
/** @param {any} c */
export function faqSection(c) {
  return `<section class="section" id="faq">
  <div class="wrap">
    <p class="eyebrow">FAQ</p>
    <h2 class="h2">よくある質問</h2>
    <div class="faq">
      ${c.faq.map((/** @type {{q:string,a:string}} */ f) => `<details>
        <summary>${esc(f.q)}</summary>
        <div class="faq-a">${esc(f.a)}</div>
      </details>`).join('\n      ')}
    </div>
  </div>
</section>`
}

/* ── 11. 申込みフォーム ─────────────────────── */
/** @param {any} c */
export function formSection(c) {
  const checks = FORM_FEATURES.map((f) => {
    const checked = c.presetFeature === f.value ? ' checked' : ''
    return `<label class="check">
          <input type="checkbox" name="features" value="${esc(f.value)}" data-label="${esc(f.label)}"${checked}>
          <span>${esc(f.label)}</span>
        </label>`
  }).join('\n        ')

  /** @param {string} name @param {string[]} opts */
  const select = (name, opts) => `<select id="${esc(name)}" name="${esc(name)}" class="select" required>
          <option value="">選択してください</option>
          ${opts.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('\n          ')}
        </select>`

  return `<section class="section section--soft" id="apply" data-cta-park>
  <div class="wrap">
    <p class="eyebrow">Apply</p>
    <h2 class="h2">3ヶ月無料でお試しする</h2>
    <p class="lead">${esc(CAMPAIGN.deadlineText)}のお申し込みが対象です。送信だけでは料金は発生しません。</p>

    <div class="form" id="form-box">
      <div class="form-status" id="form-status" role="alert" hidden></div>
      <form id="apply-form" novalidate data-cta-origin="form">
        <div class="field">
          <label for="salonName">サロン名<span class="req">必須</span></label>
          <input class="input" type="text" id="salonName" name="salonName" autocomplete="organization" required>
          <span class="err" id="err-salonName" aria-live="polite"></span>
        </div>
        <div class="field">
          <label for="contactName">ご担当者名<span class="req">必須</span></label>
          <input class="input" type="text" id="contactName" name="contactName" autocomplete="name" required>
          <span class="err" id="err-contactName" aria-live="polite"></span>
        </div>
        <div class="field">
          <label for="email">メールアドレス<span class="req">必須</span></label>
          <input class="input" type="email" id="email" name="email" autocomplete="email" inputmode="email" required>
          <span class="err" id="err-email" aria-live="polite"></span>
        </div>
        <div class="field">
          <label for="phone">電話番号<span class="req">必須</span></label>
          <input class="input" type="tel" id="phone" name="phone" autocomplete="tel" inputmode="tel" required>
          <span class="err" id="err-phone" aria-live="polite"></span>
        </div>
        <div class="field">
          <label for="salonCount">店舗数<span class="req">必須</span></label>
          ${select('salonCount', SALON_COUNT_OPTIONS)}
          <span class="err" id="err-salonCount" aria-live="polite"></span>
        </div>
        <div class="field">
          <label for="staffCount">スタッフ数<span class="req">必須</span></label>
          ${select('staffCount', STAFF_COUNT_OPTIONS)}
          <span class="err" id="err-staffCount" aria-live="polite"></span>
        </div>

        <fieldset>
          <legend class="fieldset-label">興味のある機能<span class="req">必須</span></legend>
          <div class="checks">
        ${checks}
          </div>
          <span class="err" id="err-features" aria-live="polite"></span>
        </fieldset>

        <div class="field">
          <label for="message">ご要望・ご質問<span class="opt">任意</span></label>
          <textarea class="input" id="message" name="message" rows="3"></textarea>
        </div>

        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">

        <label class="consent">
          <input type="checkbox" name="consent" required>
          <span><a href="/terms.html" target="_blank" rel="noopener">利用規約</a>および<a href="/privacy.html" target="_blank" rel="noopener">プライバシーポリシー</a>に同意します<span class="req">必須</span></span>
        </label>
        <span class="err" id="err-consent" aria-live="polite"></span>

        <button type="submit" class="btn btn--primary" data-cta="form_submit">${esc(c.ctaLabel)}</button>
        <p class="btn-note">担当者より2営業日以内にご連絡します。この時点では料金は発生しません。</p>
      </form>
    </div>
  </div>
</section>`
}

/* ── 12. 最終CTA ────────────────────────────── */
/** @param {any} c */
export function finalSection(c) {
  return `<section class="final" id="final">
  <div class="wrap">
    <h2>${esc(c.final.title)}</h2>
    <p>${esc(c.final.body)}</p>
    <div class="final-actions">
      ${cta({ href: '#apply', label: c.ctaLabel, cta: 'final' })}
    </div>
    <p class="btn-note" style="color:rgba(255,255,255,.94)">${esc(CAMPAIGN.badge)}／初期費用0円／最低契約期間なし</p>
  </div>
</section>`
}

/* ── ヘッダ・フッタ・固定CTA ───────────────── */
/** @param {any} c */
export function header(c) {
  return `<header class="hdr">
  <div class="hdr-in">
    <a href="/"><img src="/images/moyo-wordmark.png" alt="MOYO" width="1408" height="288" decoding="async"></a>
    <a href="#apply" class="hdr-cta" data-cta="header">${esc(c.ctaLabel)}</a>
  </div>
</header>`
}

export function footer() {
  return `<footer class="ftr" data-cta-park>
  <div class="wrap">
    <img src="/images/moyo-wordmark-white.png" alt="MOYO" width="1408" height="288" decoding="async" loading="lazy">
    <div class="ftr-links">
      ${FOOTER_LINKS.map((l) =>
        `<a href="${esc(l.href)}"${l.external ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a>`
      ).join('\n      ')}
    </div>
    <div>© 2026 ${esc(COMPANY)}. All rights reserved.</div>
  </div>
</footer>`
}

/** スマホ用の画面下固定CTA。フォーム／フッター上では退避する（client.mjs） */
/** @param {any} c */
export function stickyCta(c) {
  return `<div class="sticky">
  <div class="sticky-txt"><strong>${esc(CAMPAIGN.headline)}</strong>${esc(CAMPAIGN.badge)}</div>
  <a href="#apply" class="btn btn--primary" data-cta="sticky">${esc(c.ctaLabel)}</a>
</div>`
}

/** 本文（header〜sticky）を12セクションの順に組み立てる */
/** @param {any} c */
export function body(c) {
  return join([
    header(c),
    '<main>',
    heroSection(c),
    campaignSection(),
    painSection(c),
    solutionSection(c),
    flowSection(c),
    usecaseSection(c),
    featureSection(c),
    trustSection(c),
    pricingSection(c),
    faqSection(c),
    formSection(c),
    finalSection(c),
    '</main>',
    footer(),
    stickyCta(c),
  ])
}
