/**
 * イラスト調アートワークの共通スタイルと部品。
 *
 * 方針: **実在しない機能を描かない**。スタイルは写実である必要はないが、
 * 描いてよいのは実装済みの動きだけ（例: ブログに「自動投稿」ボタンは出さない）。
 * データが載る画面には「サンプル」チップを入れ、実績と読まれないようにする。
 */

export const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --purple:#6d4bf6; --purple-dark:#4c2fd4; --lav:#eeeafe; --lav2:#f6f3ff;
  --mint:#b45cf0; --ink:#14171a; --muted:#6b7280; --line:#e7e5f2; --bg:#f7f7fa;
}
body{
  font-family:'Zen Kaku Gothic New','IPAGothic',sans-serif;
  background:var(--bg); color:var(--ink); -webkit-font-smoothing:antialiased;
}
.en{font-family:'Outfit',sans-serif}
.stage{width:100%;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}

/* 文字の代わりのグレーバー（読ませる必要のない本文） */
.bar{height:8px;border-radius:99px;background:#e9e7f0}
.bar.d{background:#dcd9e8}

/* サンプル表示であることを示すチップ */
.sample{
  display:inline-block;font-size:11px;font-weight:700;color:#8b8794;
  background:#f0eef5;border:1px solid #e2dfea;border-radius:99px;padding:2px 9px;
}

/* ブラウザ枠 */
.browser{background:#fff;border-radius:18px;box-shadow:0 18px 50px rgba(80,60,140,.16);overflow:hidden;border:1px solid var(--line)}
.browser-bar{display:flex;align-items:center;gap:7px;padding:12px 16px;background:#f4f2f8;border-bottom:1px solid var(--line)}
.dot{width:10px;height:10px;border-radius:50%}
.browser-url{margin-left:10px;flex:1;height:22px;border-radius:99px;background:#fff;border:1px solid var(--line);display:flex;align-items:center;padding:0 12px;font-size:11px;color:#9b96a8}

/* スマホ画面（枠なし。LP側で枠に入れるため画面だけを描く） */
.screen{width:100%;height:100%;background:#fff;display:flex;flex-direction:column}
.statusbar{display:flex;justify-content:space-between;align-items:center;padding:26px 34px 10px;font-size:22px;font-weight:700;color:var(--ink)}
.statusbar .dots{display:flex;gap:6px}
.statusbar .dots i{width:9px;height:9px;border-radius:50%;background:#c9c5d4;display:block}
.appbar{display:flex;align-items:center;gap:14px;padding:14px 30px 18px;border-bottom:1px solid var(--line)}
.applogo{width:44px;height:44px;border-radius:13px;background:var(--purple);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800}
.apptitle{font-size:26px;font-weight:700}
.appsub{font-size:18px;color:var(--muted)}

/* チャット（特定サービスのUIを模さない、汎用のメッセージ表示） */
.chat{flex:1;padding:26px 28px 30px;display:flex;flex-direction:column;gap:20px;background:var(--lav2);
  justify-content:flex-end}  /* 実際のメッセージ画面と同じく、新しい発言を下端に置く */
.inputbar{display:flex;align-items:center;gap:14px;padding:22px 28px 34px;background:#fff;border-top:1px solid var(--line)}
.inputfield{flex:1;height:60px;border-radius:99px;background:#f4f2f8;border:1px solid var(--line);
  display:flex;align-items:center;padding:0 26px;font-size:20px;color:#b3aec0}
.sendbtn{width:60px;height:60px;border-radius:50%;background:var(--purple);color:#fff;
  display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;flex:none}
.msg{max-width:78%;display:flex;flex-direction:column;gap:8px}
.msg.me{align-self:flex-end;align-items:flex-end}
.bubble{background:#fff;border-radius:22px;padding:20px 22px;font-size:21px;line-height:1.6;box-shadow:0 2px 10px rgba(80,60,140,.07)}
.msg.me .bubble{background:var(--purple);color:#fff}
.msgtime{font-size:15px;color:#a29daf}
.chipbtn{display:inline-block;background:#fff;border:2px solid var(--purple);color:var(--purple-dark);
  border-radius:99px;padding:14px 26px;font-size:20px;font-weight:700}
`

/** @param {number} n @param {string} [cls] */
export function bars(n, cls = '') {
  const widths = ['100%', '92%', '78%', '86%', '64%', '95%', '71%']
  return Array.from({ length: n }, (_, i) =>
    `<div class="bar ${cls}" style="width:${widths[i % widths.length]}"></div>`
  ).join('')
}

/**
 * 1枚のアートワークをHTMLドキュメントにする。
 * @param {{width:number,height:number,body:string,css?:string}} o
 */
export function doc(o) {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
<style>${CSS}
html,body{width:${o.width}px;height:${o.height}px}
${o.css || ''}</style></head><body>${o.body}</body></html>`
}
