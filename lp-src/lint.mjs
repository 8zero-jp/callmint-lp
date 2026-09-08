#!/usr/bin/env node
/**
 * 広告LPの内容チェック。構文だけでなく「書いてはいけないこと」を機械で止める。
 *
 * 背景: spec/seo.md のとおり、稼働は2店舗のみで **公開してよい成果の数字は無い**。
 * 実装済みの範囲を超える表現（自動投稿・取りこぼしゼロ・離職予測）も禁止。
 * 既存の tools/seo_audit.py の unverified-claim と同じ考え方を、広告LP側にも置く。
 */
import { fileURLToPath } from 'node:url'

import { renderPage, PAGES } from './build.mjs'

export { findClaim, BANNED }


/**
 * 否定・疑問の文脈。「自動で投稿してくれますか？→いいえ」のように、
 * **禁止表現をあえて引用して否定する**書き方は正しいので通す。
 */
const NEGATION = /(ますか？|ますか\?|ません|ではありません|わけではあり|いいえ|とはお伝えできません|ものではありません|必要ありません)/

/** 実態を超える断定・捏造数値。全LP共通で禁止する。 */
const BANNED = [
  { re: /完全自動/, why: '「完全自動」— 人の確認が必要な工程が残っている' },
  { re: /取りこぼし(を)?ゼロ/, why: '「取りこぼしゼロ」— 保証できない' },
  { re: /予約確定まで(全|完全)自動/, why: '確定予約まで自動ではない' },
  { re: /離職を予測/, why: '離職予測はしていない' },
  { re: /(退職|離職)を(必ず)?(防げます|防ぎます|なくします)/, why: '防止を断定できない' },
  { re: /\d+\s*%\s*(削減|改善|向上|減少|増加|アップ)/, why: '実測していない効果の数値' },
  { re: /導入(実績|店舗数)\s*[:：]?\s*\d+/, why: '導入実績の数値は公開できない' },
  { re: /\d+\s*店舗(が|に)導入/, why: '導入店舗数は公開できない' },
  { re: /(業界平均|ある調査|調査によれば)/, why: '出典のない一般化' },
  // 2026-09 の改定で廃止された旧パック料金。復活したら止める
  { re: /機能\s*[1-4]つ[：:]/, why: '廃止された旧パック料金の表記' },
  { re: /使う機能の数で基本料/, why: '廃止された旧料金体系の説明' },
]

/** 「自動投稿」は肯定形だけを禁止する（「自動では投稿しません」は正しい記述なので通す） */
const AUTOPOST_AFFIRMATIVE = /自動(的)?(で|に)?投稿(し(ます|てくれ|た)|でき(ます|る)|されます)/

/** 各LPに必ず入っていてほしい文言 */
const REQUIRED = {
  all: [
    { re: /9月30日/, why: 'キャンペーン期限' },
    { re: /先着10店舗/, why: 'キャンペーン枠' },
    { re: /3ヶ月/, why: '無料期間' },
    { re: /初期費用/, why: '初期費用の記載' },
    { re: /最低契約期間/, why: '最低契約期間の記載' },
    { re: /自動で課金されることはありません/, why: '自動課金しない旨の明記' },
    // 3ヶ月無料はパイロット限定の特別枠。通常条件を併記しないと有利誤認になる
    { re: /通常の無料期間は14日間/, why: '通常の無料期間との差の明記' },
    { re: /¥2,980/, why: '改定後の機能ごとの月額' },
    { re: /noindex/, why: '広告LPの検索除外' },
  ],
  blog: [
    { re: /自動では投稿しません/, why: '自動投稿しない旨の明記' },
    { re: /コピー(して|し、)/, why: 'コピペ投稿である旨' },
  ],
  call: [
    { re: /739円/, why: '電話番号維持費の実費' },
    { re: /転送通話料/, why: '転送通話料の実費' },
    { re: /確定予約になるわけではありません/, why: '仮受付である旨の明記' },
  ],
  survey: [
    { re: /個人が特定される形では表示しません/, why: '匿名性の明記' },
    { re: /予測するものではありません/, why: '離職予測をしない旨' },
  ],
}

/**
 * 禁止表現を本文から探す。ヒットの直後に否定・疑問が来る場合は問題なしとみなす。
 * @param {string} text @param {RegExp} re
 * @returns {string|null} 問題のある一致（無ければ null）
 */
function findClaim(text, re) {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  for (const m of text.matchAll(g)) {
    const idx = m.index ?? 0
    const window = text.slice(idx, idx + m[0].length + 40)
    if (!NEGATION.test(window)) return m[0]
  }
  return null
}

/** タグを落として本文テキストだけにする（禁止語チェックは本文に対して行う） */
/** @param {string} html */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
}

/**
 * 1ページ分を検査して、見つかった問題を返す。
 * @param {string} html @param {string} slug
 * @returns {{file:string,rule:string,detail:string}[]}
 */
export function lintPage(html, slug) {
  /** @type {{file:string,rule:string,detail:string}[]} */
  const problems = []
  const text = visibleText(html)
  const file = `lp/${slug}/index.html`
  /** @param {string} rule @param {string} detail */
  const fail = (rule, detail) => { problems.push({ file, rule, detail }) }

  for (const b of BANNED) {
    const m = findClaim(text, b.re)
    if (m) fail('banned-claim', `${b.why}（検出: "${m}"）`)
  }

  const ap = findClaim(text, AUTOPOST_AFFIRMATIVE)
  if (ap) fail('banned-claim', `自動投稿は実装されていない（検出: "${ap}"）`)

  for (const r of REQUIRED.all) {
    if (!r.re.test(html)) fail('missing-required', `${r.why} が見つからない`)
  }
  const own = /** @type {Record<string, {re:RegExp,why:string}[]>} */ (REQUIRED)[slug] || []
  for (const r of own) {
    if (!r.re.test(html)) fail('missing-required', `${r.why} が見つからない`)
  }

  // 構造・アクセシビリティ
  const h1 = html.match(/<h1[\s>]/g) || []
  if (h1.length !== 1) fail('structure', `h1 は1つであるべき（現在 ${h1.length}）`)

  const imgs = html.match(/<img\b[^>]*>/g) || []
  for (const img of imgs) {
    if (!/\balt=/.test(img)) fail('a11y', `alt の無い img: ${img.slice(0, 70)}`)
    if (/\balt=""/.test(img) && !/aria-hidden/.test(img)) {
      fail('a11y', `alt が空の img: ${img.slice(0, 70)}`)
    }
  }

  // 画像スロットは必ず比率を持つ（CLS対策）
  // `imgslot-ph` などの子要素を拾わないよう、クラス名の区切りまで見る
  const slots = html.match(/class="imgslot(?:\s[^"]*)?"[^>]*/g) || []
  for (const s of slots) {
    if (!/--ratio:/.test(s)) fail('cls', `aspect-ratio の無い画像スロット: ${s.slice(0, 60)}`)
  }

  // 個人情報をピクセルへ渡していないこと（静的チェック）
  if (/fbq\([^)]*(email|phone|contactName|salonName)/.test(html)) {
    fail('privacy', 'ピクセルへ個人情報を渡している')
  }

  return problems
}

/** 全ページを検査する */
export function lintAll() {
  return PAGES.flatMap((cfg) => lintPage(renderPage(cfg), cfg.slug))
}

function main() {
  const problems = lintAll()
  if (problems.length) {
    console.error(`lint: ${problems.length} 件の問題`)
    for (const p of problems) console.error(`  ✗ [${p.rule}] ${p.file}: ${p.detail}`)
    process.exit(1)
  }
  console.log(`lint: OK（${PAGES.length} ページ／禁止表現 ${BANNED.length} 種を検査）`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
