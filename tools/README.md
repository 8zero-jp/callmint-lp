# tools/ — SEO 運用スクリプト

| ファイル | 役割 | いつ動く |
|---|---|---|
| `seo_audit.py` | 決定的に検査できる SEO 欠陥を洗い出す | 日次 / CI / 手動 |
| `seo_fix.py` | 判断の要らない欠陥を冪等に直す | 日次 / 手動 |
| `seo_daily.mjs` | その日の最優先1件を Claude に書かせる | 日次（GitHub Actions） |
| `gsc.mjs` | Search Console から順位を取る（任意） | `seo_daily.mjs` から |
| `optimize-images.py` | 画像を WebP 化・予算チェック | 画像追加時 / CI |

## 手元で回す

```sh
pip install pillow

python3 tools/seo_audit.py            # 今の欠陥を見る
python3 tools/seo_fix.py              # 直せるものを直す
node tools/seo_daily.mjs --dry-run    # 今日の対象だけ見る（API を叩かない）

ANTHROPIC_API_KEY=... node tools/seo_daily.mjs   # 実際に書かせる
```

## GitHub Actions に要る secrets

| secret | 要否 | 用途 |
|---|---|---|
| `ANTHROPIC_API_KEY` | **必須** | 本文生成。無いとワークフローが落ちる |
| `GSC_SERVICE_ACCOUNT_JSON` | 任意（強く推奨） | Search Console。順位が見えるようになる |
| `GSC_SITE_URL` | 任意 | 例 `https://callmintai.com/` |

`GSC_*` が未設定でもワークフローは動くが、**順位ではなくサイト側の欠陥だけ**で
対象を選ぶことになる。設定手順は `gsc.mjs` の冒頭コメントに書いてある。

## 設計のきまり

- **判断の要らないことは Python（決定的）、要ることだけ Claude**。
  sitemap や meta を LLM に書かせない
- **1日1件だけ**。まとめて生成すると質が落ち、レビューできない差分になる
- 生成後に `seo_audit.py --strict` を通す。**通らなければ差分を捨てる**
- 2週間以内に触った URL は選び直す（`seo/log.json`）
