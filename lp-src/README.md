# lp-src — 広告LPのジェネレータ

Instagram 等の広告から着地させる LP を生成します。3本の訴求を**個別に計測**するため、
1ページ1訴求で分けています。

| URL | 訴求 | 申込フォームの初期選択 |
|---|---|---|
| `/lp/survey/` | スタッフサーベイ | MOYO サーベイ |
| `/lp/blog/` | ブログ自動作成 | MOYO 集客 |
| `/lp/call/` | AI電話一次受付 | MOYO 電話 |

## 何をどこで直すか

```
lp-src/
├── config/common.mjs   キャンペーン・料金・フォーム項目・計測（3ページ共通）
├── config/imageBriefs.mjs  画像の制作指示（撮影・図解の担当者へ渡す内容）
├── config/survey.mjs   ページ固有の文章・画像・機能説明
├── config/blog.mjs
├── config/call.mjs
├── render.mjs          12セクションの共通部品（HTMLの構造）
├── styles.mjs          共通CSS（モバイルファースト・基準390px）
├── client.mjs          ブラウザ側JS（UTM保持・計測・フォーム・固定CTA）
├── html.mjs            エスケープ・画像スロット・スマホモックアップ
├── build.mjs           生成の入口
├── lint.mjs            「書いてはいけないこと」の検査
└── e2e.mjs             Playwright での主要フロー確認（任意）
```

**文章・画像・機能説明を変えたいだけなら `config/` だけ**を触ります。
レイアウトを変えるときだけ `render.mjs` / `styles.mjs` に入ります。

⚠️ **生成物を手で編集しない。** 次のビルドで上書きされます。
- `lp/<slug>/index.html` … LP本体
- `images/lp/README.md` … 必要画像の一覧（ファイル名・比率・サイズ・alt）
- `images/lp/BRIEF.md` … **画像制作指示書**。撮影・図解の担当者にそのまま渡せます
  （中身の正本は `lp-src/config/imageBriefs.mjs`。スロットとの対応はテストが検査します）

## コマンド

```bash
npm run build:lp   # lp/*/index.html と images/lp/README.md を生成
npm run check:lp   # 生成物がソースと一致するか検査（差分があれば失敗）
npm run lint       # 禁止表現・必須記載・alt・比率・PII の検査
npm test           # ユニットテスト（node:test・依存なし）
npm run typecheck  # JSDoc + checkJs による型検査
npm run verify     # lint → test → check:lp
```

`npm run build:lp` を忘れたまま config を変えると `check:lp` が落ちます。

## 書いてよいこと・いけないこと

`lint.mjs` が機械で止めます。手で直す前に、なぜ止まっているかを確認してください。

- **数値を作らない。** 稼働は2店舗のみで、公開してよい成果の数字はありません
  （`callmint-repo spec/seo.md`）。導入店舗数・離職改善率・削減時間は書けません
- **実装済みの範囲を超えない。**
  - ブログ: サロンボードへの自動投稿は**していない**（`callmint-cms docs/2026-08-18-blog-web-entry-design.md`）。
    「下書き作成」「確認」「コピーして投稿」まで
  - 電話: 「完全自動」「取りこぼしゼロ」は書けない。仮受付になる場合があることを明記する
  - サーベイ: 「離職を予測」「退職を防ぐ」は書けない
- **料金の正本**は `callmint-repo spec/pricing.md` と、このリポジトリの `tokushoho.html`。
  ユニットテストが両者の一致を検査しています。**料金を変えるときは特商法・llms.txt・
  ブログ本文も同時に直す**（`spec/seo.md` の6箇所ルール）

## 計測

既存LP（`index.html`）と**同じ PostHog プロジェクト**を使います。二重に入れません。

| イベント | 発火 |
|---|---|
| `lp_view` | ページ表示 |
| `campaign_cta_click` | CTAクリック（`cta_position` にヘッダ/ヒーロー/固定バー/最終CTA） |
| `form_start` | フォームに最初に触れたとき（1回だけ） |
| `form_submit` | 検証を通って送信を開始 |
| `form_success` | 送信成功 |
| `form_error` | 検証エラー / サーバ・通信エラー（`reason`） |

- UTM5種と初回流入URLは `localStorage` の `moyo_lp_attr` に**初回流入優先**で保持し、
  全イベントと申込内容に載せます
- **個人情報は計測に載せません。** 氏名・メール・電話・サロン名は PostHog にも
  Meta Pixel にも渡しません（`lint.mjs` と e2e が検査）
- Meta Pixel は `config/common.mjs` の `META_PIXEL_ID` が空なら**タグを出しません**。
  未設定でも表示・ビルドは壊れません

## 申込みフォーム

既存の `/api/contact`（callmint-cms）へそのまま送ります。**API も DB も変更していません。**

`contact_inquiries` は列が固定なので、追加項目（店舗数・スタッフ数・希望機能・LP種別・
UTM・初回流入URL・CTA位置）は `message` に整形して入れています。
列を増やしたくなったら cms 側の migration が必要です。

## 検索インデックス

広告LPは `noindex,follow` です。検索結果に出したいのは本体（`/` と `/blog/`）で、
広告文面は9月末で期限切れになるためです。`sitemap.xml` にも載せません。

日次SEOエージェント（`tools/seo_fix.py` / `tools/seo_audit.py`）は `lp/` を対象外に
してあります（`is_page()`）。生成物を書き換えられると次のビルドで消えるためです。
