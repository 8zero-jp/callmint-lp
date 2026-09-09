/** HTML 生成の小道具。テンプレートに値を入れる経路は必ずここを通す。 */

/** @param {unknown} v */
export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** JSON を <script> の中に安全に埋める（`</script>` と U+2028/2029 を殺す） */
/** @param {unknown} v */
export function jsonScript(v) {
  return JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/** @param {Array<string|false|null|undefined>} parts */
export function join(parts) {
  return parts.filter(Boolean).join('\n')
}

/**
 * 画像スロット。**画像が未配置でもレイアウトが崩れない**のが要件。
 *
 * - `aspect-ratio` を必ず指定する（CLS を出さない）
 * - 実ファイルが無いときは onerror で仮表示（用途とファイル名）に切り替える
 * - `loading` は above-the-fold だけ eager
 *
 * @param {{src:string, alt:string, ratio:string, caption:string, priority?:boolean, className?:string}} slot
 */
export function imageSlot(slot) {
  const { src, alt, ratio, caption, priority = false, className = '' } = slot
  const cls = ['imgslot', className].filter(Boolean).join(' ')
  return `<figure class="${esc(cls)}" style="--ratio:${esc(ratio)}">
  <img src="${esc(src)}" alt="${esc(alt)}" width="1200" height="900"
       decoding="async" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'}
       onerror="this.closest('.imgslot').classList.add('is-missing');this.remove()">
  <figcaption class="imgslot-ph" aria-hidden="true">
    <span class="imgslot-ph-label">画像スロット</span>
    <span class="imgslot-ph-caption">${esc(caption)}</span>
    <span class="imgslot-ph-meta">${esc(ratio)}／${esc(src)}</span>
  </figcaption>
</figure>`
}

/**
 * スマホ画面風モックアップ。中身は画像スロット（9:19.5＝実機に近い比率）。
 * @param {{src:string, alt:string, caption:string, label?:string}} o
 */
export function phoneMock(o) {
  return `<div class="phone">
  <div class="phone-frame">
    <div class="phone-notch" aria-hidden="true"></div>
    ${imageSlot({ src: o.src, alt: o.alt, ratio: '9 / 19.5', caption: o.caption, className: 'imgslot--phone' })}
  </div>
  ${o.label ? `<p class="phone-label">${esc(o.label)}</p>` : ''}
</div>`
}
