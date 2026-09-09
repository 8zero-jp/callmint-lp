/**
 * 広告LPのイラスト調アートワーク定義。
 *
 * ⚠️ 描いてよいのは**実装済みの動きだけ**。特に:
 *   - ブログに「サロンボードへ自動投稿」のようなボタンを描かない
 *   - 電話の受付画面を「予約確定」と読める表示にしない
 *   - サーベイで個人が特定できる粒度を描かない
 *   - データが載る画面には「サンプル」チップを入れる
 */
import { doc, bars } from './common.mjs'

const P = '#6d4bf6', PD = '#4c2fd4', LAV = '#eeeafe'

/* ══ 図解1: 匿名性のしくみ（survey/anonymity 4:3） ══ */
function anonymity() {
  /** @param {number} x @param {number} y */
  const person = (x, y) => `<g transform="translate(${x},${y})">
    <circle cx="0" cy="-16" r="17" fill="#fff" stroke="${P}" stroke-width="3"/>
    <path d="M-25 26 a25 25 0 0 1 50 0z" fill="#fff" stroke="${P}" stroke-width="3"/></g>`
  return doc({
    width: 1200, height: 900,
    css: `body{display:flex;align-items:center;justify-content:center;background:#fff}`,
    body: `<svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="900" fill="#fff"/>
  <text x="600" y="86" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="40" font-weight="700" fill="#14171a">誰が答えたかは、表示されません</text>

  <!-- 左: スタッフが回答 -->
  <text x="240" y="176" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="26" font-weight="700" fill="${PD}">スタッフが回答</text>
  ${[0, 1, 2, 3].map((i) => person(175 + (i % 2) * 130, 285 + Math.floor(i / 2) * 160)).join('')}
  <rect x="80" y="540" width="268" height="92" rx="20" fill="#faf9fe" stroke="#e7e5f2" stroke-width="2"/>
  <text x="214" y="578" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="21" font-weight="700" fill="#14171a">LINEで約40秒</text>
  <text x="214" y="608" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="19" fill="#5b5566">名前は入力しません</text>

  <!-- 中央: 個人と切り離す -->
  <g>
    <line x1="480" y1="150" x2="480" y2="770" stroke="${P}" stroke-width="4" stroke-dasharray="14 12" opacity=".55"/>
    <rect x="360" y="404" width="240" height="92" rx="46" fill="${LAV}" stroke="${P}" stroke-width="3"/>
    <text x="480" y="446" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="23" font-weight="700" fill="${PD}">名前を外す</text>
    <text x="480" y="476" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="19" fill="#5b5566">個人とひも付けない</text>
  </g>

  <!-- 落ちていく個人情報 -->
  <g opacity=".5">
    <rect x="392" y="596" width="176" height="40" rx="20" fill="#f2eff9" stroke="#cfc7e6" stroke-width="2"/>
    <text x="480" y="623" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="19" fill="#8a83a0">氏名・個人の回答</text>
    <path d="M480 656 v42 M464 684 l16 18 16-18" stroke="#b7afd0" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="480" y="746" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="19" fill="#a49dbb">保存も表示もしない</text>
  </g>

  <!-- 右: 店舗単位の傾向 -->
  <text x="880" y="176" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="26" font-weight="700" fill="${PD}">見えるのは店舗の傾向だけ</text>
  <rect x="640" y="222" width="480" height="400" rx="26" fill="#fff" stroke="#e7e5f2" stroke-width="3"/>
  <text x="676" y="278" font-family="Zen Kaku Gothic New" font-size="22" font-weight="700" fill="#14171a">店舗コンディション</text>
  ${[
    { y: 330, w: 330, label: 'A店' },
    { y: 410, w: 250, label: 'B店' },
    { y: 490, w: 300, label: 'C店' },
  ].map((r) => `
    <text x="676" y="${r.y + 22}" font-family="Zen Kaku Gothic New" font-size="21" fill="#5b5566">${r.label}</text>
    <rect x="740" y="${r.y}" width="330" height="30" rx="15" fill="#f0edfa"/>
    <rect x="740" y="${r.y}" width="${r.w}" height="30" rx="15" fill="${P}"/>`).join('')}
  <text x="676" y="580" font-family="Zen Kaku Gothic New" font-size="19" fill="#8a83a0">回答は店舗ごとにまとめて集計します</text>

  <rect x="640" y="656" width="480" height="92" rx="20" fill="${LAV}"/>
  <text x="880" y="694" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="21" font-weight="700" fill="${PD}">個人の評価には使いません</text>
  <text x="880" y="724" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="19" fill="#5b5566">「誰が何と答えたか」を見る画面はありません</text>
</svg>`,
  })
}

/* ══ 図解2: 従来との比較（blog/comparison 4:3） ══ */
function comparison() {
  /** @param {{x:number,w:number,label:string,fill:string,stroke:string,tc:string}} s */
  const step = (s) => `
    <rect x="${s.x}" y="0" width="${s.w}" height="86" rx="20" fill="${s.fill}" stroke="${s.stroke}" stroke-width="3"/>
    <text x="${s.x + s.w / 2}" y="52" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="23" font-weight="700" fill="${s.tc}">${s.label}</text>`
  /** @param {number} x */
  const arrow = (x) => `<path d="M${x} 43 h22 M${x + 14} 34 l10 9 -10 9" stroke="#c3bdd4" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`

  return doc({
    width: 1200, height: 900,
    css: `body{background:#fff}`,
    body: `<svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="900" fill="#fff"/>

  <!-- これまで -->
  <text x="80" y="150" font-family="Zen Kaku Gothic New" font-size="30" font-weight="700" fill="#6b7280">これまで</text>
  <g transform="translate(80,196)">
    ${step({ x: 0, w: 190, label: '撮影', fill: '#f4f3f7', stroke: '#e2e0e8', tc: '#5b5566' })}
    ${arrow(196)}
    ${step({ x: 236, w: 300, label: '文章を一から考える', fill: '#f4f3f7', stroke: '#e2e0e8', tc: '#5b5566' })}
    ${arrow(542)}
    ${step({ x: 582, w: 230, label: '書く', fill: '#f4f3f7', stroke: '#e2e0e8', tc: '#5b5566' })}
    ${arrow(818)}
    ${step({ x: 858, w: 182, label: '投稿', fill: '#f4f3f7', stroke: '#e2e0e8', tc: '#5b5566' })}
    <rect x="0" y="112" width="1040" height="16" rx="8" fill="#ddd9e6"/>
    <text x="1040" y="160" text-anchor="end" font-family="Zen Kaku Gothic New" font-size="21" fill="#8a83a0">書く時間が丸ごとかかる</text>
  </g>

  <!-- MOYO -->
  <text x="80" y="512" font-family="Zen Kaku Gothic New" font-size="30" font-weight="700" fill="${PD}">MOYO</text>
  <g transform="translate(80,558)">
    ${step({ x: 0, w: 190, label: '撮影', fill: '#fff', stroke: P, tc: PD })}
    ${arrow(196)}
    ${step({ x: 236, w: 190, label: '送る', fill: '#fff', stroke: P, tc: PD })}
    ${arrow(432)}
    ${step({ x: 472, w: 250, label: '確認・修正', fill: '#fff', stroke: P, tc: PD })}
    ${arrow(728)}
    ${step({ x: 768, w: 272, label: 'コピーして投稿', fill: '#fff', stroke: P, tc: PD })}
    <rect x="0" y="112" width="1040" height="16" rx="8" fill="#e9e4fb"/>
    <rect x="0" y="112" width="430" height="16" rx="8" fill="${P}"/>
    <text x="1040" y="160" text-anchor="end" font-family="Zen Kaku Gothic New" font-size="21" fill="${PD}">下書きが用意された状態から始まる</text>
  </g>

  <rect x="80" y="770" width="1040" height="76" rx="20" fill="${LAV}"/>
  <text x="600" y="817" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="23" font-weight="700" fill="${PD}">投稿する前に、必ず人が内容を確認します</text>
</svg>`,
  })
}

/* ══ スマホ画面の共通ラッパ ══ */
/** @param {string} inner @param {string} [css] */
const phone = (inner, css = '') => doc({
  width: 780, height: 1690, css,
  body: `<div class="screen">
  <div class="statusbar"><span class="en">9:41</span><span class="dots"><i></i><i></i><i></i></span></div>
  ${inner}
</div>`,
})

/** メッセージ画面（特定サービスのUIは模さない） */
/** @param {{title:string,sub:string,msgs:{me?:boolean,html:string,time:string}[]}} o */
const chatScreen = (o) => phone(`
  <div class="appbar"><div class="applogo en">M</div>
    <div><div class="apptitle">${o.title}</div><div class="appsub">${o.sub}</div></div></div>
  <div class="chat">
    ${o.msgs.map((m) => `<div class="msg${m.me ? ' me' : ''}">
      <div class="bubble">${m.html}</div><div class="msgtime en">${m.time}</div></div>`).join('')}
  </div>
  <div class="inputbar"><div class="inputfield">メッセージを入力</div><div class="sendbtn">↑</div></div>`)

export const ARTWORKS = [
  /* ── サーベイ ── */
  { file: 'survey/anonymity.webp', html: anonymity() },
  { file: 'blog/comparison.webp', html: comparison() },

  {
    file: 'survey/dashboard.webp',
    html: doc({
      width: 1200, height: 750,
      css: `body{display:flex;align-items:center;justify-content:center;padding:34px;background:var(--lav2)}
      .browser{width:100%;height:100%}
      .head{display:flex;justify-content:space-between;align-items:center;padding:26px 32px 18px}
      .h1{font-size:24px;font-weight:700}
      .grid{display:grid;grid-template-columns:1fr 300px;gap:26px;padding:0 32px 28px}
      .chart{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px}
      .rowlist{display:flex;flex-direction:column;gap:12px}
      .row{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px}
      .row .nm{font-size:16px;font-weight:700;width:52px}
      .track{flex:1;height:12px;border-radius:99px;background:#f0edfa;overflow:hidden}
      .fill{height:100%;border-radius:99px;background:var(--purple)}
      .delta{font-size:14px;font-weight:700}
      .up{color:#2e9e6b} .down{color:#d1665b} .flat{color:#9b96a8}`,
      body: `<div class="browser">
  <div class="browser-bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span>
    <span class="browser-url">moyo.tokyo／サーベイ</span></div>
  <div class="head"><div class="h1">店舗コンディションの推移</div><span class="sample">サンプル表示</span></div>
  <div class="grid">
    <div class="chart">
      <svg width="100%" height="300" viewBox="0 0 760 300">
        ${[0, 1, 2, 3].map((i) => `<line x1="40" y1="${40 + i * 66}" x2="740" y2="${40 + i * 66}" stroke="#eeecf4" stroke-width="2"/>`).join('')}
        <polyline points="60,120 175,104 290,148 405,132 520,92 635,86 720,74" fill="none" stroke="${P}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="60,178 175,192 290,186 405,214 520,222 635,206 720,212" fill="none" stroke="${'#b45cf0'}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>
        <polyline points="60,150 175,158 290,140 405,150 520,146 635,152 720,140" fill="none" stroke="#c9c3dd" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        ${[60, 175, 290, 405, 520, 635, 720].map((x, i) => `<circle cx="${x}" cy="${[120, 104, 148, 132, 92, 86, 74][i]}" r="7" fill="#fff" stroke="${P}" stroke-width="4"/>`).join('')}
        ${['4月', '5月', '6月', '7月', '8月', '9月', ''].map((m, i) => `<text x="${60 + i * 115}" y="282" text-anchor="middle" font-family="Zen Kaku Gothic New" font-size="17" fill="#9b96a8">${m}</text>`).join('')}
      </svg>
    </div>
    <div class="rowlist">
      <div class="row"><span class="nm">A店</span><span class="track"><span class="fill" style="width:82%"></span></span><span class="delta up">▲</span></div>
      <div class="row"><span class="nm">B店</span><span class="track"><span class="fill" style="width:54%"></span></span><span class="delta down">▼</span></div>
      <div class="row"><span class="nm">C店</span><span class="track"><span class="fill" style="width:68%"></span></span><span class="delta flat">＝</span></div>
      <div class="row"><span class="nm">D店</span><span class="track"><span class="fill" style="width:74%"></span></span><span class="delta up">▲</span></div>
      <div style="font-size:14px;color:var(--muted);line-height:1.7;margin-top:4px">前回からの変化を店舗ごとに表示します。<br>個人の回答は表示されません。</div>
    </div>
  </div>
</div>`,
    }),
  },

  {
    file: 'survey/flow-invite.webp',
    html: chatScreen({
      title: 'MOYO サーベイ',
      sub: '今月のアンケートが届いています',
      msgs: [
        { html: 'おつかれさまです。<br>今月の店舗アンケートです。', time: '10:00' },
        { html: '所要時間はおよそ40秒です。<br>回答は匿名で集計されます。<br><br><span class="chipbtn">回答する</span>', time: '10:00' },
      ],
    }),
  },

  {
    file: 'survey/mobile-response.webp',
    html: phone(`
  <div class="appbar"><div class="applogo en">M</div>
    <div><div class="apptitle">店舗アンケート</div><div class="appsub">匿名で回答しています</div></div></div>
  <div style="padding:34px 34px 0;display:flex;align-items:center;gap:16px">
    <div style="flex:1;height:12px;border-radius:99px;background:#efecf8;overflow:hidden">
      <div style="width:60%;height:100%;background:var(--purple);border-radius:99px"></div></div>
    <div class="en" style="font-size:20px;font-weight:700;color:var(--purple-dark)">3 / 5</div>
  </div>
  <div style="padding:44px 34px;flex:1">
    <div style="font-size:30px;font-weight:700;line-height:1.5;margin-bottom:40px">いまの働きやすさは<br>どのくらいですか？</div>
    ${[
        ['とても働きやすい', false], ['働きやすい', true], ['ふつう', false],
        ['やや働きにくい', false], ['働きにくい', false],
      ].map(([label, on]) => `
      <div style="display:flex;align-items:center;gap:20px;border:3px solid ${on ? P : '#e7e5f2'};background:${on ? LAV : '#fff'};
                  border-radius:20px;padding:26px 28px;margin-bottom:18px">
        <span style="width:30px;height:30px;border-radius:50%;border:3px solid ${on ? P : '#d6d2e2'};
                     background:${on ? P : '#fff'};display:flex;align-items:center;justify-content:center">
          ${on ? '<span style="width:12px;height:12px;border-radius:50%;background:#fff;display:block"></span>' : ''}</span>
        <span style="font-size:24px;font-weight:${on ? 700 : 500};color:${on ? PD : '#14171a'}">${label}</span>
      </div>`).join('')}
  </div>
  <div style="padding:0 34px 44px">
    <div style="background:var(--purple);color:#fff;border-radius:99px;padding:26px;text-align:center;font-size:25px;font-weight:700">次へ</div>
    <div style="text-align:center;font-size:18px;color:var(--muted);margin-top:20px">お名前は記録されません</div>
  </div>`),
  },

  {
    file: 'survey/flow-summary.webp',
    html: phone(`
  <div class="appbar"><div class="applogo en">M</div>
    <div><div class="apptitle">今月のまとめ</div><div class="appsub">店舗ごとの変化</div></div></div>
  <div style="padding:26px 30px 0"><span class="sample" style="font-size:16px;padding:5px 14px">サンプル表示</span></div>
  <div style="padding:24px 30px;flex:1;display:flex;flex-direction:column;gap:20px">
    ${[
        { n: 'A店', w: 82, d: '前回より上向き', c: '#2e9e6b', m: '▲' },
        { n: 'B店', w: 54, d: '前回より下向き', c: '#d1665b', m: '▼' },
        { n: 'C店', w: 68, d: '変化は小さい', c: '#9b96a8', m: '＝' },
        { n: 'D店', w: 74, d: '前回より上向き', c: '#2e9e6b', m: '▲' },
      ].map((r) => `
      <div style="border:2px solid #eceaf4;border-radius:22px;padding:26px 28px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
          <span style="font-size:26px;font-weight:700">${r.n}</span>
          <span style="font-size:22px;font-weight:700;color:${r.c}">${r.m} ${r.d}</span></div>
        <div style="height:16px;border-radius:99px;background:#f0edfa;overflow:hidden">
          <div style="width:${r.w}%;height:100%;background:var(--purple);border-radius:99px"></div></div>
      </div>`).join('')}
    <div style="background:var(--lav);border-radius:20px;padding:26px;font-size:20px;line-height:1.7;color:var(--purple-dark)">
      B店の数値が前回から下がっています。次の巡回で話を聞いてみてください。</div>
    <div style="flex:1"></div>
    <div style="border-top:2px solid #f0eef6;padding-top:26px;padding-bottom:16px;font-size:19px;line-height:1.75;color:var(--muted)">
      表示されるのは店舗ごとの集計です。<br>個人の回答は表示されません。</div>
  </div>`),
  },

  /* ── ブログ ── */
  {
    file: 'blog/generation-flow.webp',
    html: doc({
      width: 1200, height: 750,
      css: `body{display:flex;align-items:center;justify-content:center;padding:34px;background:var(--lav2)}
      .browser{width:100%;height:100%}
      .wrap{display:grid;grid-template-columns:330px 1fr;gap:28px;padding:26px 32px}
      .ph{border-radius:16px;background:linear-gradient(140deg,#e6dffb,#f3eafb);border:1px solid var(--line);
          height:250px;display:flex;align-items:center;justify-content:center;color:#9c93bb;font-size:15px}
      .lbl{font-size:14px;font-weight:700;color:var(--muted);margin-bottom:8px}
      .box{border:1px solid var(--line);border-radius:14px;padding:16px 18px;background:#fff;margin-bottom:16px}
      .kw{display:inline-block;background:var(--lav);color:var(--purple-dark);border-radius:99px;
          padding:6px 14px;font-size:14px;font-weight:700;margin-right:8px}
      .btn{display:inline-block;border-radius:99px;padding:13px 26px;font-size:16px;font-weight:700}`,
      body: `<div class="browser">
  <div class="browser-bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span>
    <span class="browser-url">MOYO 管理画面／ブログ</span></div>
  <div style="display:flex;justify-content:space-between;align-items:center;padding:24px 32px 6px">
    <div style="font-size:23px;font-weight:700">下書きができました</div><span class="sample">サンプル表示</span></div>
  <div class="wrap">
    <div>
      <div class="lbl">送信された写真</div>
      <div class="ph">施術写真</div>
      <div class="lbl" style="margin-top:20px">担当スタッフ</div>
      <div class="box" style="font-size:16px">佐藤（文体を学習済み）</div>
      <div class="lbl">狙うキーワード</div>
      <div><span class="kw">インナーカラー</span><span class="kw">ボブ</span></div>
    </div>
    <div>
      <div class="lbl">タイトル</div>
      <div class="box" style="font-size:19px;font-weight:700">くすみベージュのインナーカラーで、伸ばしかけのボブを軽やかに</div>
      <div class="lbl">本文</div>
      <div class="box" style="display:flex;flex-direction:column;gap:11px;height:214px">
        <div style="font-size:15px;line-height:1.7;color:#3d3a46">こんにちは。今回はお客様のご希望で、耳にかけたときだけ見えるインナーカラーを入れました。</div>
        ${bars(6)}
      </div>
      <div style="display:flex;gap:12px;align-items:center">
        <span class="btn" style="background:var(--purple);color:#fff">この内容で確定</span>
        <span class="btn" style="background:#fff;border:2px solid var(--line);color:var(--muted)">AIに直してもらう</span>
      </div>
    </div>
  </div>
</div>`,
    }),
  },

  {
    file: 'blog/flow-photo.webp',
    html: chatScreen({
      title: 'MOYO ブログ',
      sub: '写真を送ると下書きを作ります',
      msgs: [
        { html: '施術写真を送ってください。', time: '18:20' },
        {
          me: true,
          html: '<div style="width:250px;height:190px;border-radius:16px;background:linear-gradient(140deg,#efe7fb,#f8f1fb);display:flex;align-items:center;justify-content:center;color:#a99cc4;font-size:19px">施術写真</div>',
          time: '18:22',
        },
        { html: '受け取りました。<br>狙いたいキーワードはありますか？<br><br><span class="chipbtn">おまかせ</span>', time: '18:22' },
      ],
    }),
  },

  {
    file: 'blog/flow-line-preview.webp',
    html: chatScreen({
      title: 'MOYO ブログ',
      sub: '下書きが届きました',
      msgs: [
        { html: '下書きができました。', time: '18:24' },
        {
          html: '<b style="font-size:22px;line-height:1.5">くすみベージュのインナーカラーで、伸ばしかけのボブを軽やかに</b><br><br>'
            + 'こんにちは。今回はお客様のご希望で、耳にかけたときだけ見えるインナーカラーを入れました。'
            + '伸ばしかけのボブも、じつは……'
            + '<br><br><span class="chipbtn">全文を見る</span>',
          time: '18:24',
        },
        { html: '内容を確認して、必要なら直してから投稿してください。', time: '18:24' },
      ],
    }),
  },

  {
    file: 'blog/flow-copy.webp',
    html: phone(`
  <div class="appbar"><div class="applogo en">M</div>
    <div><div class="apptitle">記事の確認</div><div class="appsub">コピーして投稿します</div></div></div>
  <div style="padding:34px;flex:1;display:flex;flex-direction:column">
    <div style="border:2px solid #eceaf4;border-radius:22px;padding:30px;flex:1;display:flex;flex-direction:column;gap:16px">
      <div style="font-size:26px;font-weight:700;line-height:1.5">くすみベージュのインナーカラーで、伸ばしかけのボブを軽やかに</div>
      <div style="height:170px;border-radius:16px;background:linear-gradient(140deg,#efe7fb,#f8f1fb);display:flex;align-items:center;justify-content:center;color:#a99cc4;font-size:19px">施術写真</div>
      <div style="font-size:20px;line-height:1.8;color:#3d3a46">こんにちは。今回はお客様のご希望で、耳にかけたときだけ見えるインナーカラーを入れました。</div>
      ${bars(5).replace(/height:8px/g, 'height:12px')}
    </div>
    <div style="background:var(--purple);color:#fff;border-radius:99px;padding:28px;text-align:center;font-size:26px;font-weight:700;margin-top:30px">
      本文をコピー</div>
    <div style="background:var(--lav);border-radius:20px;padding:24px;margin-top:22px;font-size:19px;line-height:1.7;color:var(--purple-dark);text-align:center">
      コピーした本文を貼り付けて<br>投稿してください</div>
  </div>`),
  },

  {
    file: 'blog/article-preview.webp',
    html: doc({
      width: 1200, height: 800,
      css: `body{display:flex;align-items:center;justify-content:center;padding:36px;background:var(--lav2)}
      .browser{width:100%;height:100%}
      .art{padding:34px 60px}
      .meta{font-size:15px;color:var(--muted);margin-bottom:12px}
      .ttl{font-size:34px;font-weight:700;line-height:1.45;margin-bottom:22px}
      .hero{height:236px;border-radius:16px;background:linear-gradient(140deg,#e9e0fb,#f6eefb);
            display:flex;align-items:center;justify-content:center;color:#a496c4;font-size:17px;margin-bottom:24px}
      .p{font-size:17px;line-height:1.95;color:#3d3a46;margin-bottom:14px}`,
      body: `<div class="browser">
  <div class="browser-bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span>
    <span class="browser-url">サロンのブログ記事</span></div>
  <div class="art">
    <div class="meta">2026年9月6日 ／ 担当: 佐藤</div>
    <div class="ttl">くすみベージュのインナーカラーで、<br>伸ばしかけのボブを軽やかに</div>
    <div class="hero">施術写真</div>
    <div class="p">こんにちは。今回はお客様のご希望で、耳にかけたときだけ見えるインナーカラーを入れました。伸ばしかけのボブは重く見えがちですが、内側に明るさを入れると動いたときに軽さが出ます。</div>
    <div class="p">仕上げは軽く巻いて、動きが出るようにしています。乾かすだけでも形が決まるので、朝の時間が短くなります。</div>
    <div style="display:flex;flex-direction:column;gap:12px">${bars(5)}</div>
  </div>
</div>`,
    }),
  },

  /* ── 電話 ── */
  {
    file: 'call/transcript.webp',
    html: doc({
      width: 1200, height: 750,
      css: `body{display:flex;align-items:center;justify-content:center;padding:34px;background:var(--lav2)}
      .browser{width:100%;height:100%}
      .head{display:flex;justify-content:space-between;align-items:center;padding:24px 32px 12px}
      .tags{display:flex;gap:10px;padding:0 32px 16px}
      .tag{background:var(--lav);color:var(--purple-dark);border-radius:99px;padding:7px 16px;font-size:14px;font-weight:700}
      .tag.g{background:#f0eef5;color:#7b7688}
      .log{padding:0 32px;display:flex;flex-direction:column;gap:14px}
      .turn{display:flex;gap:14px;align-items:flex-start}
      .who{flex:none;width:64px;font-size:14px;font-weight:700;padding-top:12px}
      .say{flex:1;border-radius:14px;padding:13px 18px;font-size:16px;line-height:1.65}
      .ai .who{color:var(--purple-dark)} .ai .say{background:var(--lav)}
      .cu .who{color:var(--muted)} .cu .say{background:#f5f4f8}`,
      body: `<div class="browser">
  <div class="browser-bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span>
    <span class="browser-url">MOYO 管理画面／通話ログ</span></div>
  <div class="head">
    <div><div style="font-size:22px;font-weight:700">通話の内容</div>
      <div style="font-size:15px;color:var(--muted);margin-top:4px">9月6日 14:32 ／ 090-0000-0000 ／ 2分18秒</div></div>
    <span class="sample">サンプル表示</span></div>
  <div class="tags"><span class="tag">予約希望</span><span class="tag g">新規のお客様</span><span class="tag g">受付内容をスタッフへ通知済み</span></div>
  <div class="log">
    <div class="turn ai"><span class="who">AI</span><span class="say">お電話ありがとうございます。AIスタッフです。ご予約とお問い合わせ、どちらでしょうか。</span></div>
    <div class="turn cu"><span class="who">お客様</span><span class="say">予約をお願いしたいんですけど。</span></div>
    <div class="turn ai"><span class="who">AI</span><span class="say">ご希望の日時をお伺いします。</span></div>
    <div class="turn cu"><span class="who">お客様</span><span class="say">今週の土曜、午後で空いてますか。</span></div>
    <div class="turn ai"><span class="who">AI</span><span class="say">9月12日土曜日の14時にご案内できます。お名前を伺えますか。</span></div>
    <div class="turn cu"><span class="who">お客様</span><span class="say">サンプルです。よろしくお願いします。</span></div>
  </div>
  <div style="margin:20px 32px 0;background:var(--lav);border-radius:16px;padding:20px 24px;display:flex;align-items:center;gap:16px">
    <span style="width:34px;height:34px;border-radius:50%;background:var(--purple);color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;flex:none">✓</span>
    <span style="font-size:16px;line-height:1.6;color:var(--purple-dark)">
      <b>受け付けた内容をスタッフへ通知しました。</b> 手が空いたタイミングで確認できます。</span>
  </div>
</div>`,
    }),
  },

  {
    file: 'call/flow-incoming.webp',
    html: phone(`
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
              background:linear-gradient(170deg,#5b3ae0,#6d4bf6 45%,#8a3fd0);color:#fff;padding:50px">
    <div style="font-size:22px;letter-spacing:.16em;opacity:.85;margin-bottom:26px">通話中</div>
    <div style="width:190px;height:190px;border-radius:50%;background:rgba(255,255,255,.16);
                border:4px solid rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;
                font-size:70px;font-weight:800;font-family:Outfit,sans-serif;margin-bottom:36px">M</div>
    <div style="font-size:36px;font-weight:700;margin-bottom:14px">AIが応答しています</div>
    <div style="font-size:22px;opacity:.9;text-align:center;line-height:1.7">
      施術の手を止めずに<br>ご用件をお伺いしています</div>
    <div style="display:flex;gap:12px;margin-top:44px">
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
        const h = [26, 48, 34, 66, 44, 72, 38, 54, 28][i]
        return `<span style="width:9px;height:${h}px;border-radius:99px;background:rgba(255,255,255,.72);display:block"></span>`
      }).join('')}
    </div>
    <div style="margin-top:56px;background:rgba(255,255,255,.16);border-radius:20px;padding:24px 30px;
                font-size:20px;line-height:1.7;text-align:center">
      「AIスタッフです」と<br>最初にお伝えしています</div>
  </div>`),
  },

  {
    file: 'call/flow-intake.webp',
    html: phone(`
  <div class="appbar"><div class="applogo en">M</div>
    <div><div class="apptitle">受け付けた内容</div><div class="appsub">9月6日 14:32 の通話</div></div></div>
  <div style="padding:26px 32px 0;display:flex;gap:10px;align-items:center">
    <span style="background:#fff5e6;border:2px solid #f0d5a8;color:#a8721b;border-radius:99px;
                 padding:10px 20px;font-size:19px;font-weight:700">仮受付</span>
    <span class="sample" style="font-size:16px;padding:5px 14px">サンプル表示</span>
  </div>
  <div style="padding:26px 32px;flex:1;display:flex;flex-direction:column;gap:18px">
    ${[
        ['ご用件', '予約希望'],
        ['ご希望日時', '9月12日（土）14:00'],
        ['お名前', 'サンプル 様'],
        ['ご連絡先', '090-0000-0000'],
        ['ご要望', 'カットとカラーを希望'],
      ].map(([k, v]) => `
      <div style="border:2px solid #eceaf4;border-radius:20px;padding:24px 28px">
        <div style="font-size:18px;color:var(--muted);margin-bottom:10px">${k}</div>
        <div style="font-size:25px;font-weight:700">${v}</div></div>`).join('')}
    <div style="background:var(--lav);border-radius:20px;padding:26px;font-size:20px;line-height:1.75;color:var(--purple-dark)">
      内容を確認してください。<br>お店で確定すると、お客様へご連絡します。</div>
    <div style="flex:1"></div>
    <div style="display:flex;flex-direction:column;gap:16px;padding-bottom:20px">
      <div style="background:var(--purple);color:#fff;border-radius:99px;padding:26px;text-align:center;font-size:25px;font-weight:700">この内容で確定する</div>
      <div style="background:#fff;border:3px solid #e7e5f2;color:var(--muted);border-radius:99px;padding:24px;text-align:center;font-size:23px;font-weight:700">お客様へ折り返す</div>
    </div>
  </div>`),
  },

  {
    file: 'call/flow-notify.webp',
    html: chatScreen({
      title: 'MOYO 電話',
      sub: '受付内容をお知らせします',
      msgs: [
        {
          html: '<b style="font-size:22px">予約希望を受け付けました</b><br><br>'
            + '9月12日（土）14:00<br>サンプル 様／090-0000-0000<br>カットとカラーを希望'
            + '<br><br><span style="color:#a8721b;font-weight:700">まだ仮受付です</span>'
            + '<br><br><span class="chipbtn">内容を確認する</span>',
          time: '14:35',
        },
        { html: '施術が終わってからで大丈夫です。', time: '14:35' },
      ],
    }),
  },
]
