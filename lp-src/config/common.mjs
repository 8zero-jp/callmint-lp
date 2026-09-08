/**
 * 3つの広告LPが共有する設定。
 *
 * ここに書いてよいのは **事実として確認できるものだけ**。
 *   - 料金の正本 …… callmint-repo `spec/pricing.md` と `tokushoho.html`
 *   - 機能の範囲 …… callmint-cms `lib/moyoPricing.ts` / `lib/moyoTabs.ts` / docs/
 *   - 稼働実績   …… callmint-repo `spec/seo.md`（公開してよい成果の数字は「無い」）
 *
 * 導入店舗数・離職改善率・削減時間などの数値は **作らない**。
 */

/** 公開ドメイン。正本は seo/keywords.json の "site"（build.mjs が読んで上書きする） */
export const DEFAULT_SITE = 'https://call.moyo.tokyo'

/** 既存LPと同じ送信先。callmint-cms `app/api/contact/route.ts`（CORS 許可済み） */
export const CONTACT_API = 'https://callmint-cms.vercel.app/api/contact'

/**
 * PostHog。既存LP（index.html）と同一プロジェクトを使う＝計測基盤を二重に入れない。
 */
export const POSTHOG = {
  key: 'phc_CZUuhM26c3BNkvvAx5Cg79Ci77Ux935w4ckfCdhrUXcR',
  host: 'https://us.i.posthog.com',
}

/**
 * Meta Pixel。**未設定（空文字）でも表示・ビルドが壊れない**こと。
 * 値を入れるとピクセルが読み込まれる。個人情報は絶対に送らない（client.mjs 参照）。
 */
export const META_PIXEL_ID = ''

/**
 * 通常の無料トライアル期間。正本は moyo.tokyo。
 * キャンペーンの3ヶ月はこれを延長した**パイロット店舗限定の特別枠**なので、
 * 通常条件との差が分かるよう必ず併記する（有利誤認を避ける）。
 */
export const NORMAL_TRIAL = {
  standard: '14日間',
  survey: '2ヶ月',
  text: '通常の無料期間は14日間（スタッフサーベイ単体は2ヶ月）です',
}

/** 2026年9月のパイロット募集キャンペーン */
export const CAMPAIGN = {
  badge: '9月30日まで・先着10店舗',
  headline: 'MOYOを3ヶ月無料でお試し',
  deadlineText: '2026年9月30日まで',
  /** 箇条書き（キャンペーンセクションと料金セクションの両方で使う） */
  terms: [
    '2026年9月30日までにお申し込みいただいた店舗が対象です',
    'ご利用開始日から3ヶ月間、月額が無料になります',
    '通常の無料期間は14日間（スタッフサーベイ単体は2ヶ月）です。パイロット店舗に限り3ヶ月に延長します',
    '4ヶ月目から通常料金です（金額は下の「料金」に記載しています）',
    '初期費用は0円です',
    '最低契約期間はありません。いつでも解約できます',
    'パイロット店舗として、月1回程度の簡単なヒアリングにご協力をお願いする場合があります',
  ],
  /**
   * 課金開始条件と継続確認の方法。
   * 「黙っていると自動で有料になる」と読まれないよう、明示的に書く。
   */
  billing: {
    title: '料金が発生するタイミング',
    points: [
      'このフォームを送信した時点では、料金は一切発生しません。この時点でクレジットカードの登録も必要ありません。',
      '担当者からご連絡し、内容にご納得いただいたうえで利用を開始します。',
      '無料期間が終わる2週間前にメールでご案内します。',
      '継続のご意思を確認できた場合にのみ、4ヶ月目から有料契約に移行します。ご返信がないまま自動で課金されることはありません。',
      '継続されない場合は、費用は一切かかりません。',
    ],
  },
}

/**
 * 料金。**正本は moyo.tokyo の料金セクション**（2026-09 改定）。
 *
 * 2026-09 の改定で「機能の数で決まるパック料金」は廃止され、
 * **使う機能の月額を足す**方式になった。電話だけは月の通話件数で決まる。
 *
 * ⚠️ call.moyo.tokyo の `tokushoho.html` は旧パック料金のままで、
 *    この新料金と食い違っている。特商法ページの更新は別途必要（人の承認が要る）。
 *
 * すべて税抜・月額。
 */
export const PRICING = {
  note: '複雑なプランはありません。使う機能の月額を足すだけです。',

  /** 機能ごとの月額（電話以外） */
  features: [
    { key: 'marketing', name: 'ブログ・口コミ対応', price: '¥2,980', unit: '/月' },
    { key: 'line', name: 'LINE会員証・クーポン', price: '¥2,980', unit: '/月' },
    { key: 'survey', name: 'スタッフサーベイ', price: '¥2,980', unit: '/店・月' },
  ],

  /** サーベイは店舗が増えるほど1店舗あたりが下がる */
  surveyTiers: [
    { label: '1〜3店舗目', price: '¥2,980' },
    { label: '4〜10店舗目', price: '¥2,480' },
    { label: '11〜20店舗目', price: '¥1,980' },
    { label: '21店舗目〜', price: '¥1,480' },
  ],

  /** AI電話は月の通話件数で決まる */
  callTiers: [
    { name: 'お試し', label: '月10件まで', price: '¥3,500', per: '1件あたり ¥350' },
    { name: 'スタンダード', label: '月50件まで', price: '¥5,000', per: '1件あたり ¥100' },
    { name: 'ビジネス', label: '月200件まで', price: '¥14,800', per: '1件あたり ¥74' },
  ],
  callOverage: '超過分はどの段階でも ¥100/件',

  /** 4つすべてを使う場合のセット価格 */
  bundles: [
    { name: '全部入り', detail: '電話 月50件まで', single: '単品合計 ¥13,940', off: '15% OFF', price: '¥11,800' },
    { name: '全部入り ビジネス', detail: '電話 月200件まで', single: '単品合計 ¥23,740', off: '17% OFF', price: '¥19,800' },
  ],
  bundleNote: 'サーベイは1店舗分を含みます。お試し（月10件）は全部入りセットの対象外です。',

  /**
   * 電話まわりの実費。**無料キャンペーンの対象外**。
   * 番号維持費は moyo.tokyo・tokushoho.html とも ¥739 で一致している。
   */
  callActualCosts: [
    {
      label: 'AI専用電話番号の維持費',
      price: '月額 739円',
      note: '電話をご利用の場合。為替レートにより変動する場合があります',
    },
    {
      label: '転送サービス料',
      price: '月額 約500円',
      note: '既存の番号から転送する場合。ご契約中の通信事業者へお支払いいただきます',
    },
    {
      label: '転送通話料',
      price: '通信事業者の料金',
      note: '既存の番号から転送する場合。ご契約中の通信事業者へお支払いいただきます',
    },
    {
      label: '通話件数の超過分',
      price: '1件あたり 100円',
      note: 'どの段階でも同じ単価です。無料期間中も超過分は実費です',
    },
  ],

  initialNote: '初期費用は0円です。工事も機材も必要ありません。',
  taxNote: '表示価格はすべて税抜です。別途、消費税が加算されます。',
}

/** 申込みフォームの「希望機能」。値は cms `lib/moyoPricing.ts` の MOYO_FEATURES と揃える */
export const FORM_FEATURES = [
  { value: 'survey', label: 'スタッフサーベイ' },
  { value: 'marketing', label: 'ブログ・口コミ対応' },
  { value: 'call', label: 'AI電話対応' },
  { value: 'line', label: 'LINE会員証・クーポン' },
]

export const SALON_COUNT_OPTIONS = ['1店舗', '2〜3店舗', '4〜9店舗', '10店舗以上']
export const STAFF_COUNT_OPTIONS = ['1〜3人', '4〜9人', '10〜29人', '30人以上']

/** 計測イベント名。client.mjs と __tests__ が参照する */
export const EVENTS = /** @type {const} */ ({
  view: 'lp_view',
  ctaClick: 'campaign_cta_click',
  formStart: 'form_start',
  formSubmit: 'form_submit',
  formSuccess: 'form_success',
  formError: 'form_error',
})

/** URL から拾って保持するパラメータ */
export const UTM_KEYS = /** @type {const} */ ([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
])

/** 全LP共通のフッターリンク（既存サイトの実在ページのみ） */
export const FOOTER_LINKS = [
  { href: '/privacy.html', label: 'プライバシーポリシー' },
  { href: '/terms.html', label: '利用規約' },
  { href: '/tokushoho.html', label: '特定商取引法に基づく表記' },
  { href: '/', label: 'MOYO トップ' },
  { href: 'https://8zero.co.jp', label: '運営会社', external: true },
]

export const COMPANY = '合同会社8ZERO'
