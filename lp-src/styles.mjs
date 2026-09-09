/**
 * 広告LP共通のスタイル。
 *
 * 設計方針
 *   - モバイルファースト。基準は 390px 幅（iPhone 14/15 相当）
 *   - 色は既存LP（index.html :root）と同じトークンを使う。青系にはしない
 *   - 角丸・広めの余白・控えめな影。派手なアニメーションは使わない
 *   - 画像スロットは aspect-ratio で場所を先に確保する（CLS を出さない）
 */
export const STYLES = `
:root{
  /* 既存LP index.html と同一のブランドトークン（変数名も揃える） */
  --bg:#f7f7fa;
  --surface:#ffffff;
  --surface2:#eeeafe;
  --green:#6d4bf6;        /* MOYO パープル（既存の変数名を踏襲） */
  --green-light:#eeeafe;
  --green-dark:#4c2fd4;
  --mint:#b45cf0;         /* ラベンダー寄りのアクセント */
  --text:#14171a;
  --muted:#4d545b;
  --border:#e7e5f2;
  --radius:20px;
  --shadow:0 10px 30px rgba(109,75,246,.10);
  --shadow-lg:0 20px 50px rgba(109,75,246,.14);
  /* --grad は「明るい背景に置く大きな文字」専用（h1 のグラデ文字）。
     白文字を載せる面には --grad-deep を使う: 白との比が最小 5.27:1 で
     小さい文字でも WCAG AA(4.5:1) を満たす。--grad の淡い端(#b45cf0)は
     白文字だと 3.67:1 しかなく、本文サイズでは不足する。 */
  --grad:linear-gradient(135deg,#6d4bf6 0%,#8b5cf6 45%,#b45cf0 100%);
  --grad-deep:linear-gradient(135deg,#5b3ae0 0%,#6d4bf6 45%,#8a3fd0 100%);
  --grad-soft:linear-gradient(160deg,#f4f1ff 0%,#eeeafe 55%,#faf8ff 100%);
  --sticky-h:76px;
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0;background:var(--bg);color:var(--text);
  font-family:'Zen Kaku Gothic New',-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;
  line-height:1.8;font-size:15px;-webkit-font-smoothing:antialiased;
  overflow-x:hidden;
}
img{max-width:100%;display:block}
a{color:var(--green-dark)}
h1,h2,h3{line-height:1.35;letter-spacing:-.01em;margin:0}
p{margin:0}
[id]{scroll-margin-top:24px}
.en{font-family:'Outfit',sans-serif}

/* 固定CTAぶんの余白。フッターまで来たら JS で .cta-parked が付く */
body{padding-bottom:calc(var(--sticky-h) + env(safe-area-inset-bottom,0px))}
@media (min-width:861px){body{padding-bottom:0}}

.wrap{max-width:560px;margin:0 auto;padding:0 20px}
.section{padding:56px 0}
.section--tint{background:var(--surface)}
.section--soft{background:var(--grad-soft)}
.eyebrow{
  display:inline-block;font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;
  letter-spacing:.16em;text-transform:uppercase;color:var(--green-dark);
  background:var(--green-light);border-radius:999px;padding:6px 14px;margin-bottom:14px;
}
.h2{font-size:26px;font-weight:700;margin-bottom:14px;word-break:auto-phrase}
.h2 em{font-style:normal;color:var(--green);display:block}
.lead{font-size:15px;color:var(--muted);margin-bottom:28px}
.card{
  background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:22px;box-shadow:var(--shadow);
}
.stack{display:grid;gap:14px}
.stack--lg{gap:20px}

/* ── 画像スロット ─────────────────────────────
   画像が無いときは onerror で .is-missing が付き、仮表示に切り替わる。
   どちらの状態でも高さは --ratio で確保されるのでレイアウトは動かない。 */
.imgslot{
  position:relative;margin:0;border-radius:16px;overflow:hidden;
  aspect-ratio:var(--ratio,4 / 3);background:var(--surface2);
  border:1px solid var(--border);
}
.imgslot img{width:100%;height:100%;object-fit:cover}
.imgslot-ph{
  position:absolute;inset:0;display:none;flex-direction:column;gap:6px;
  align-items:center;justify-content:center;text-align:center;padding:18px;
  background:repeating-linear-gradient(45deg,#f3f0ff,#f3f0ff 10px,#eeeafe 10px,#eeeafe 20px);
  color:var(--green-dark);
}
.imgslot.is-missing .imgslot-ph{display:flex}
.imgslot-ph-label{
  font-family:'Outfit',sans-serif;font-size:10px;font-weight:700;letter-spacing:.14em;
  text-transform:uppercase;background:#fff;border-radius:999px;padding:4px 10px;
}
.imgslot-ph-caption{font-size:13px;font-weight:500;line-height:1.6;max-width:26em}
.imgslot-ph-meta{font-family:'Outfit',sans-serif;font-size:10px;color:var(--muted);word-break:break-all}

/* ── スマホモックアップ ── */
.phone{display:flex;flex-direction:column;align-items:center;gap:10px}
.phone-frame{
  position:relative;width:210px;padding:9px;border-radius:34px;background:#1b1630;
  box-shadow:var(--shadow-lg);
}
.phone-notch{
  position:absolute;top:15px;left:50%;transform:translateX(-50%);
  width:64px;height:16px;border-radius:999px;background:#0f0c1c;z-index:2;
}
.imgslot--phone{border-radius:26px;border:none}
.phone-label{font-size:13px;color:var(--muted);text-align:center;max-width:230px}

/* ── ヘッダ ── */
.hdr{
  position:sticky;top:0;z-index:40;background:rgba(255,255,255,.92);
  backdrop-filter:blur(10px);border-bottom:1px solid var(--border);
}
.hdr-in{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 20px;max-width:1200px;margin:0 auto}
.hdr img{height:26px;width:auto}
.hdr-cta{
  font-size:13px;font-weight:700;color:#fff;background:var(--green);
  border-radius:999px;padding:9px 16px;text-decoration:none;white-space:nowrap;
}

/* ── ファーストビュー ── */
.hero{background:var(--grad-soft);padding:28px 0 44px;position:relative}
.hero-badge{
  display:inline-flex;align-items:center;gap:8px;background:var(--grad-deep);color:#fff;
  border-radius:999px;padding:8px 16px;font-size:12px;font-weight:700;
  box-shadow:var(--shadow);margin-bottom:18px;
}
.hero-badge::before{content:"";width:7px;height:7px;border-radius:50%;background:#fff;flex:none}
.hero h1{font-size:30px;font-weight:700;margin-bottom:16px;letter-spacing:-.02em;
  /* 日本語を文節で折り返す。「か？」だけが行に取り残されるのを防ぐ。
     未対応ブラウザは無視するだけで、従来どおりの折り返しになる。 */
  word-break:auto-phrase}
.hero h1 em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;display:block}
.hero-sub{font-size:15px;color:var(--muted);margin-bottom:24px}
.hero-media{margin-bottom:24px}

/* ── ボタン ── */
.btn{
  display:flex;align-items:center;justify-content:center;gap:8px;width:100%;
  border:none;cursor:pointer;text-decoration:none;text-align:center;
  font-family:inherit;font-size:16px;font-weight:700;
  padding:16px 22px;border-radius:999px;transition:transform .15s,box-shadow .15s;
}
.btn--primary{background:var(--grad-deep);color:#fff;box-shadow:0 10px 26px rgba(109,75,246,.34)}
.btn--primary:hover{transform:translateY(-1px);box-shadow:0 14px 32px rgba(109,75,246,.42)}
.btn--ghost{background:#fff;color:var(--green-dark);border:1.5px solid var(--green-light)}
.btn:focus-visible{outline:3px solid var(--green-dark);outline-offset:3px}
.btn-note{font-size:12px;color:var(--muted);text-align:center;margin-top:10px}

/* ── キャンペーン ── */
.camp{background:var(--grad-deep);color:#fff;border-radius:var(--radius);padding:26px 22px;box-shadow:var(--shadow-lg)}
.camp-badge{
  display:inline-block;background:rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.4);
  border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;margin-bottom:14px;
}
.camp h2{font-size:25px;font-weight:700;margin-bottom:8px}
.camp-sub{font-size:14px;opacity:.92;margin-bottom:20px}
.camp-terms{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.camp-terms li{position:relative;padding-left:26px;font-size:13.5px;line-height:1.75}
.camp-terms li::before{
  content:"";position:absolute;left:0;top:.55em;width:14px;height:8px;
  border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg);
}
.billing{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;margin-top:16px}
.billing h3{font-size:15px;font-weight:700;color:var(--green-dark);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.billing ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.billing li{font-size:13.5px;color:var(--muted);padding-left:20px;position:relative;line-height:1.75}
.billing li::before{content:"";position:absolute;left:4px;top:.72em;width:6px;height:6px;border-radius:50%;background:var(--mint)}

/* ── 悩み ── */
.pain{display:grid;gap:12px}
.pain-item{
  display:flex;gap:14px;align-items:flex-start;background:var(--surface);
  border:1px solid var(--border);border-radius:16px;padding:18px;
}
.pain-icon{
  flex:none;width:34px;height:34px;border-radius:11px;background:var(--green-light);
  color:var(--green-dark);display:flex;align-items:center;justify-content:center;
  font-family:'Outfit',sans-serif;font-weight:700;font-size:14px;
}
.pain-item p{font-size:14.5px}

/* ── 解決 ── */
.sol{display:grid;gap:16px}
.sol-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow)}
.sol-item h3{font-size:17px;font-weight:700;margin-bottom:8px;color:var(--green-dark)}
.sol-item p{font-size:14px;color:var(--muted)}

/* ── フロー ── */
.flow{display:grid;gap:28px}
.flow-step{display:grid;gap:16px;justify-items:center;text-align:center}
.flow-num{
  width:34px;height:34px;border-radius:50%;background:var(--grad-deep);color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;flex:none;
}
.flow-step h3{font-size:17px;font-weight:700}
.flow-step p{font-size:14px;color:var(--muted);max-width:30em}

/* ── 機能 ── */
.feat{display:grid;gap:12px}
.feat-item{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px}
.feat-item h3{font-size:15.5px;font-weight:700;margin-bottom:6px;display:flex;gap:9px;align-items:flex-start}
.feat-item h3::before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:var(--mint);margin-top:.62em}
.feat-item p{font-size:13.5px;color:var(--muted);padding-left:15px}

/* ── 安心材料 ── */
.trust{display:grid;gap:12px}
.trust-item{background:var(--surface2);border-radius:16px;padding:18px}
.trust-item h3{font-size:15px;font-weight:700;color:var(--green-dark);margin-bottom:6px}
.trust-item p{font-size:13.5px;color:var(--muted)}

/* ── 料金 ── */
.price-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px;box-shadow:var(--shadow)}
.price-card + .price-card{margin-top:14px}
.price-card h3{font-size:16px;font-weight:700;margin-bottom:6px}
.price-card > p{font-size:13px;color:var(--muted);margin-bottom:14px}
.ptable{width:100%;border-collapse:collapse;font-size:14px}
.ptable th,.ptable td{text-align:left;padding:11px 0;border-bottom:1px solid var(--border);vertical-align:top}
.ptable tr:last-child th,.ptable tr:last-child td{border-bottom:none}
.ptable th{font-weight:500;color:var(--muted);width:50%;padding-right:10px}
/* 金額だけを折り返さない。行のラベル（「転送サービス料」等）まで nowrap にすると
   狭い画面でラベルが1文字ずつ折れて読めなくなる。 */
.ptable td{text-align:right;font-family:'Outfit',sans-serif;font-weight:700;padding-left:8px}
.ptable td .amt{white-space:nowrap}
.ptable .note{display:block;font-family:inherit;font-weight:400;font-size:11.5px;color:var(--muted);white-space:normal;text-align:right;margin-top:3px}
.price-free{background:var(--green-light);border:1px solid rgba(109,75,246,.22);border-radius:14px;padding:14px 16px;font-size:13.5px;color:var(--green-dark);margin-bottom:16px}
.price-free strong{font-weight:700}
.fineprint{font-size:12px;color:var(--muted);margin-top:14px;line-height:1.8}
.fineprint a{color:var(--green-dark)}

/* ── FAQ ── */
.faq{display:grid;gap:10px}
.faq details{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden}
.faq summary{
  cursor:pointer;list-style:none;padding:16px 46px 16px 18px;position:relative;
  font-size:14.5px;font-weight:700;
}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{
  content:"";position:absolute;right:20px;top:22px;width:8px;height:8px;
  border-right:2px solid var(--green);border-bottom:2px solid var(--green);
  transform:rotate(45deg);transition:transform .2s;
}
.faq details[open] summary::after{transform:rotate(-135deg)}
.faq summary:focus-visible{outline:3px solid var(--green-dark);outline-offset:-3px}
.faq-a{padding:0 18px 18px;font-size:13.5px;color:var(--muted)}

/* ── フォーム ── */
.form{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px;box-shadow:var(--shadow-lg)}
.field{margin-bottom:16px}
.field > label,.fieldset-label{display:block;font-size:13.5px;font-weight:700;margin-bottom:7px}
.req{color:#c02020;font-size:11px;margin-left:6px;font-weight:700}
.opt{color:var(--muted);font-size:11px;margin-left:6px;font-weight:400}
.input,.select{
  width:100%;font-family:inherit;font-size:16px;color:var(--text);
  background:var(--bg);border:1.5px solid var(--border);border-radius:12px;padding:13px 14px;
}
.select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath fill='%236d4bf6' d='M6 8 0 0h12z'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 14px center;background-size:11px;padding-right:36px}
.input:focus,.select:focus{outline:none;border-color:var(--green);background:#fff;box-shadow:0 0 0 3px rgba(109,75,246,.14)}
.input[aria-invalid="true"],.select[aria-invalid="true"]{border-color:#c02020;background:#fff8f8}
.err{display:block;font-size:12px;color:#c02020;margin-top:6px;font-weight:500}
fieldset{border:none;margin:0 0 16px;padding:0}
.checks{display:grid;gap:9px}
.check{
  display:flex;gap:10px;align-items:flex-start;background:var(--bg);
  border:1.5px solid var(--border);border-radius:12px;padding:12px 14px;cursor:pointer;font-size:14px;
}
.check input{width:19px;height:19px;margin:1px 0 0;accent-color:var(--green);flex:none;cursor:pointer}
.check:has(input:checked){border-color:var(--green);background:var(--green-light)}
.check:has(input:focus-visible){outline:3px solid var(--green-dark);outline-offset:2px}
.consent{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.7}
.consent input{width:19px;height:19px;margin:2px 0 0;accent-color:var(--green);flex:none;cursor:pointer}
.consent a{color:var(--green-dark);text-underline-offset:2px}
.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.form-status{border-radius:12px;padding:14px 16px;font-size:14px;margin-bottom:16px;font-weight:500}
.form-status--ok{background:var(--green-light);color:var(--green-dark);border:1px solid rgba(109,75,246,.28)}
.form-status--ng{background:#fff3f3;color:#a01818;border:1px solid #f0caca}
.form-done{text-align:center;padding:16px 0}
.form-done h3{font-size:19px;color:var(--green-dark);margin-bottom:10px}
.form-done p{font-size:14px;color:var(--muted)}

/* ── 最終CTA ── */
.final{background:var(--grad-deep);color:#fff;padding:52px 0}
.final h2{font-size:25px;font-weight:700;margin-bottom:12px}
.final p{font-size:14.5px;opacity:.92;margin-bottom:24px}
.final .btn--primary{background:#fff;color:var(--green-dark);box-shadow:0 10px 26px rgba(0,0,0,.18)}

/* ── フッター ── */
.ftr{background:#14101f;color:rgba(255,255,255,.62);padding:36px 0 44px;text-align:center;font-size:12.5px}
.ftr img{height:20px;width:auto;margin:0 auto 18px;opacity:.6}
.ftr-links{display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:center;margin-bottom:18px}
.ftr-links a{color:rgba(255,255,255,.72);text-decoration:none}
.ftr-links a:hover{color:#fff;text-decoration:underline}

/* ── モバイル固定CTA ──
   フォーム／フッターが視界に入ったら .is-parked で退避させる（邪魔しない）。 */
.sticky{
  position:fixed;left:0;right:0;bottom:0;z-index:50;
  background:rgba(255,255,255,.96);backdrop-filter:blur(10px);
  border-top:1px solid var(--border);box-shadow:0 -6px 24px rgba(20,16,31,.10);
  padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));
  display:flex;align-items:center;gap:12px;
  transition:transform .28s ease,opacity .28s ease;
}
.sticky.is-parked{transform:translateY(120%);opacity:0;pointer-events:none}
.sticky-txt{flex:1;min-width:0;font-size:11.5px;line-height:1.45;color:var(--muted)}
.sticky-txt strong{display:block;font-size:13px;color:var(--text);font-weight:700}
.sticky .btn{width:auto;flex:none;font-size:14px;padding:13px 20px}
@media (min-width:861px){.sticky{display:none}}

/* ── PC（スマホが主役。中央1カラムを保ったまま余白と文字を広げる） ── */
@media (min-width:861px){
  body{font-size:16px}
  .wrap{max-width:920px;padding:0 32px}
  .section{padding:88px 0}
  .hero{padding:52px 0 72px}
  .hero h1{font-size:46px}
  .hero-sub{font-size:17px;max-width:34em}
  .h2{font-size:34px}
  .camp h2{font-size:34px}
  .final h2{font-size:34px}
  .hdr img{height:30px}
  .btn{width:auto;min-width:280px}
  .hero-actions,.final-actions{display:flex;gap:14px;flex-wrap:wrap}
  .btn-note{text-align:left}
  .final .btn-note{text-align:center}
  .hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
  .hero-media{margin-bottom:0}
  .pain,.feat,.trust{grid-template-columns:1fr 1fr}
  .sol{grid-template-columns:1fr 1fr}
  .flow{grid-template-columns:repeat(3,1fr);gap:32px;align-items:start}
  .form{max-width:640px;margin:0 auto;padding:32px}
  .final-actions{justify-content:center}
  .camp{padding:40px 36px}
}
@media (min-width:861px){
  .hero-actions .btn,.final-actions .btn{min-width:240px}
}

/* 動きを減らす設定を尊重する */
@media (prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
  .sticky.is-parked{transform:none;display:none}
}
`
