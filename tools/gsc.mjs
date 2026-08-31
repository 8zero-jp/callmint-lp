/**
 * Google Search Console から実際の検索パフォーマンスを取る（依存パッケージなし）。
 *
 * 必要な secrets（未設定なら null を返して呼び出し側は素通りする）:
 *   GSC_SERVICE_ACCOUNT_JSON … サービスアカウントの JSON をそのまま入れる
 *   GSC_SITE_URL             … Search Console のプロパティ（例 https://callmintai.com/）
 *
 * セットアップ:
 *   1. GCP でサービスアカウントを作り、鍵(JSON)を発行
 *   2. Search Console のプロパティ設定 → ユーザーと権限 → そのサービスアカウントの
 *      メールアドレスを「制限付き」で追加
 *   3. JSON をまるごと GitHub の Actions secret へ
 *
 * これが無いと日次エージェントは「サイト側の欠陥」しか見られない。
 * 入れると「11〜20位にいて、あと一押しで1位を狙えるKW」が分かるようになる。
 */
import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600,
  }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${b64url(signer.sign(sa.private_key))}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`GSC token failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
}

/**
 * 直近28日のクエリ別パフォーマンスを返す。
 * @returns {Promise<null | {rows: Array<{query,page,clicks,impressions,ctr,position}>, striking: Array}>}
 *   striking … 表示は取れているのに11〜30位で止まっているクエリ＝伸ばせば1位を狙える層
 */
export async function fetchSearchPerformance() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  const site = process.env.GSC_SITE_URL;
  if (!raw || !site) return null;

  const sa = JSON.parse(raw);
  const token = await accessToken(sa);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;

  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      // 直近3日はデータが確定しないので手前で切る
      startDate: daysAgo(31), endDate: daysAgo(3),
      dimensions: ["query", "page"], rowLimit: 500, type: "web",
    }),
  });
  if (!res.ok) throw new Error(`GSC query failed: ${res.status} ${await res.text()}`);

  const rows = ((await res.json()).rows ?? []).map((r) => ({
    query: r.keys[0], page: r.keys[1],
    clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
  }));

  // 「あと一押し」層: 表示回数がそれなりにあり、11〜30位。ここを押すのが一番効く。
  const striking = rows
    .filter((r) => r.impressions >= 20 && r.position > 10 && r.position <= 30)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);

  return { rows, striking };
}
