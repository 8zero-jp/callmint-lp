#!/usr/bin/env node
/**
 * 広告LPの主要フローをブラウザで通す確認（Playwright）。
 *
 *   # 別ターミナルで静的サーバを立てる
 *   python3 -m http.server 8899
 *   # 依存はここでだけ使うので、必要なときに入れる（package.json には載せていない）
 *   npm i --no-save playwright-core
 *   node lp-src/e2e.mjs
 *
 * 確認する内容: UTMの保持 / 計測イベント6種 / 入力検証 / 送信成功・失敗 /
 * 二重送信の防止 / ハニーポット / 画像未配置時のフォールバック / キーボード操作。
 *
 * 外部通信はしない（PostHog と画像・フォントは遮断し、/api/contact はスタブ化する）。
 * 別の Chromium を使うときは環境変数 CHROME に実行ファイルのパスを渡す。
 */
import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const results = []
const ok = (n, c, extra='') => results.push(`${c ? '  ok  ' : ' FAIL '} ${n}${extra ? ' — ' + extra : ''}`)

async function newPage({ apiStatus = 200, apiBody = { ok: true } } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } })
  const p = await ctx.newPage()
  const events = []
  const posted = []
  // PostHog をスタブ化してイベントを捕まえる（外部通信はしない）
  await p.addInitScript(() => {
    window.__events = []
    // __SV を立てておくと、ページ側の PostHog スニペットは「初期化済み」と判断して
    // 何も上書きしない（スニペット冒頭の `e.__SV || (...)` ガード）。
    window.posthog = {
      __SV: 1,
      capture: (n, props) => window.__events.push({ n, props }),
      register: (props) => window.__events.push({ n: '__register', props }),
      init: () => {},
    }
  })
  await p.route('**/api/contact', async route => {
    posted.push(JSON.parse(route.request().postData() || '{}'))
    if (apiStatus === 0) return route.abort('failed')
    await route.fulfill({ status: apiStatus, contentType: 'application/json', body: JSON.stringify(apiBody) })
  })
  await p.route('**/*.{png,webp,jpg,css,woff2}', r => r.abort())
  await p.route('**://us*.i.posthog.com/**', r => r.abort())
  await p.route('**://fonts.g*/**', r => r.abort())
  return { ctx, p, posted, getEvents: () => p.evaluate(() => window.__events) }
}

const UTM = '?utm_source=instagram&utm_medium=paid_social&utm_campaign=sep2026_call&utm_content=story_a&utm_term=salon_phone'

/* 1. lp_view と UTM の保持 */
{
  const { ctx, p, getEvents } = await newPage()
  await p.goto('http://localhost:8899/lp/call/' + UTM, { waitUntil: 'load' })
  const ev = await getEvents()
  const view = ev.find(e => e.n === 'lp_view')
  ok('lp_view が発火する', !!view)
  ok('lp_view に UTM 5種が乗る',
    view && view.props.utm_source === 'instagram' && view.props.utm_medium === 'paid_social'
    && view.props.utm_campaign === 'sep2026_call' && view.props.utm_content === 'story_a'
    && view.props.utm_term === 'salon_phone')
  ok('lp_view に LP種別が乗る', view && view.props.lp === 'call')
  ok('初回流入URLを保持する', view && view.props.landing_url.includes('utm_source=instagram'))

  /* UTM 無しで再訪しても初回流入が残る */
  await p.goto('http://localhost:8899/lp/call/', { waitUntil: 'load' })
  const ev2 = await getEvents()
  const view2 = ev2.find(e => e.n === 'lp_view')
  ok('UTM無しの再訪でも初回流入の帰属が残る',
    view2 && view2.props.utm_source === 'instagram' && view2.props.landing_url.includes('utm_source=instagram'))
  await ctx.close()
}

/* 2. CTA クリック */
{
  const { ctx, p, getEvents } = await newPage()
  await p.goto('http://localhost:8899/lp/call/' + UTM, { waitUntil: 'load' })
  await p.click('.hero-actions a[data-cta="hero"]')
  const ev = await getEvents()
  const c = ev.find(e => e.n === 'campaign_cta_click')
  ok('campaign_cta_click が発火し CTA位置が乗る', c && c.props.cta_position === 'hero')
  ok('CTAでフォームへ遷移する', p.url().endsWith('#apply'))
  await ctx.close()
}

/* 3. 入力検証 */
{
  const { ctx, p, posted, getEvents } = await newPage()
  await p.goto('http://localhost:8899/lp/call/', { waitUntil: 'load' })
  await p.click('#apply-form button[type="submit"]')
  ok('未入力では送信しない', posted.length === 0)
  ok('サロン名のエラーが出る', (await p.textContent('#err-salonName')).includes('サロン名'))
  ok('同意のエラーが出る', (await p.textContent('#err-consent')).includes('同意'))
  const ev = await getEvents()
  ok('form_error(validation) が出る', ev.some(e => e.n === 'form_error' && e.props.reason === 'validation'))

  await p.fill('#salonName', 'テストサロン')
  await p.fill('#contactName', '山田太郎')
  await p.fill('#email', 'bad-email')
  await p.fill('#phone', '123')
  await p.click('#apply-form button[type="submit"]')
  ok('不正なメールを弾く', (await p.textContent('#err-email')).includes('形式'))
  ok('桁数の足りない電話を弾く', (await p.textContent('#err-phone')).includes('桁'))
  ok('form_start が1回だけ発火する', (await getEvents()).filter(e => e.n === 'form_start').length === 1)
  await ctx.close()
}

/* 4. 送信成功 */
{
  const { ctx, p, posted, getEvents } = await newPage()
  await p.goto('http://localhost:8899/lp/call/' + UTM, { waitUntil: 'load' })
  await p.fill('#salonName', 'テストサロン')
  await p.fill('#contactName', '山田太郎')
  await p.fill('#email', 'test@example.com')
  await p.fill('#phone', '090-1234-5678')
  await p.selectOption('#salonCount', '2〜3店舗')
  await p.selectOption('#staffCount', '4〜9人')
  await p.check('input[name="consent"]')
  await p.click('#apply-form button[type="submit"]')
  await p.waitForSelector('.form-done', { timeout: 5000 })
  ok('送信に成功し完了表示になる', true)
  ok('APIへ1回だけ送信する', posted.length === 1, `${posted.length}回`)
  const body = posted[0]
  ok('既存APIの項目名で送る', ['salonName','contactName','email','phone','message','website'].every(k => k in body))
  ok('message に LP種別が入る', body.message.includes('(call)'))
  ok('message に店舗数・スタッフ数が入る', body.message.includes('2〜3店舗') && body.message.includes('4〜9人'))
  ok('message に希望機能が入る', body.message.includes('AI電話一次受付'))
  ok('message に UTM が入る', body.message.includes('instagram') && body.message.includes('sep2026_call'))
  ok('message に初回流入URLが入る', body.message.includes('初回流入URL'))
  const ev = await getEvents()
  ok('form_submit → form_success の順に発火', ev.findIndex(e => e.n === 'form_submit') < ev.findIndex(e => e.n === 'form_success'))
  const succ = ev.find(e => e.n === 'form_success')
  const evJson = JSON.stringify(ev)
  ok('計測イベントに個人情報を含めない',
    !evJson.includes('test@example.com') && !evJson.includes('山田太郎') && !evJson.includes('090-1234-5678') && !evJson.includes('テストサロン'))
  ok('form_success に希望機能が乗る', succ && Array.isArray(succ.props.features) && succ.props.features.includes('call'))
  await ctx.close()
}

/* 5. 二重送信の防止 */
{
  const { ctx, p, posted } = await newPage()
  await p.goto('http://localhost:8899/lp/call/', { waitUntil: 'load' })
  await p.fill('#salonName', 'A'); await p.fill('#contactName', 'B')
  await p.fill('#email', 'a@b.co'); await p.fill('#phone', '09012345678')
  await p.selectOption('#salonCount', '1店舗'); await p.selectOption('#staffCount', '1〜3人')
  await p.check('input[name="consent"]')
  const btn = await p.$('#apply-form button[type="submit"]')
  await btn.click(); await btn.click({ force: true }).catch(() => {}); await btn.click({ force: true }).catch(() => {})
  await p.waitForSelector('.form-done', { timeout: 5000 })
  ok('連打しても送信は1回だけ', posted.length === 1, `${posted.length}回`)
  await ctx.close()
}

/* 6. 送信失敗 */
{
  const { ctx, p, getEvents } = await newPage({ apiStatus: 500, apiBody: { error: 'データ保存に失敗しました' } })
  await p.goto('http://localhost:8899/lp/call/', { waitUntil: 'load' })
  await p.fill('#salonName', 'A'); await p.fill('#contactName', 'B')
  await p.fill('#email', 'a@b.co'); await p.fill('#phone', '09012345678')
  await p.selectOption('#salonCount', '1店舗'); await p.selectOption('#staffCount', '1〜3人')
  await p.check('input[name="consent"]')
  await p.click('#apply-form button[type="submit"]')
  await p.waitForSelector('.form-status--ng', { timeout: 5000 })
  ok('失敗時にエラーを表示する', (await p.textContent('#form-status')).includes('送信に失敗'))
  ok('失敗後は再送信できる', await p.isEnabled('#apply-form button[type="submit"]'))
  ok('form_error(server) が出る', (await getEvents()).some(e => e.n === 'form_error' && e.props.reason === 'network_or_server'))
  await ctx.close()
}

/* 7. ハニーポット */
{
  const { ctx, p, posted } = await newPage()
  await p.goto('http://localhost:8899/lp/call/', { waitUntil: 'load' })
  await p.fill('#salonName', 'A'); await p.fill('#contactName', 'B')
  await p.fill('#email', 'a@b.co'); await p.fill('#phone', '09012345678')
  await p.selectOption('#salonCount', '1店舗'); await p.selectOption('#staffCount', '1〜3人')
  await p.check('input[name="consent"]')
  await p.evaluate(() => { document.querySelector('[name="website"]').value = 'http://spam.example' })
  await p.click('#apply-form button[type="submit"]')
  await p.waitForSelector('.form-done', { timeout: 5000 })
  ok('ハニーポットが埋まった送信はAPIへ送らない', posted.length === 0, `${posted.length}回`)
  await ctx.close()
}

/* 8. 画像未配置でもレイアウトが崩れない */
{
  const { ctx, p } = await newPage()
  await p.goto('http://localhost:8899/lp/survey/', { waitUntil: 'load' })
  // loading="lazy" の画像は画面に入るまで読み込まれない＝onerror も出ない。
  // 実利用と同じく一度スクロールして全スロットを通過させてから判定する。
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y)
      await new Promise(r => setTimeout(r, 40))
    }
    window.scrollTo(0, 0)
  })
  await p.waitForTimeout(600)
  const r = await p.evaluate(() => {
    const slots = [...document.querySelectorAll('.imgslot')]
    return {
      total: slots.length,
      missing: slots.filter(s => s.classList.contains('is-missing')).length,
      zeroHeight: slots.filter(s => s.getBoundingClientRect().height < 40).length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  ok('画像スロットが7つある', r.total === 7, `${r.total}個`)
  ok('未配置は仮表示に切り替わる', r.missing === 7, `${r.missing}/${r.total}`)
  ok('高さが潰れるスロットが無い', r.zeroHeight === 0)
  ok('横スクロールが出ない', r.overflow <= 1, `${r.overflow}px`)
  await ctx.close()
}

/* 9. キーボード操作 */
{
  const { ctx, p } = await newPage()
  await p.goto('http://localhost:8899/lp/blog/', { waitUntil: 'load' })
  await p.focus('#salonName')
  const seq = []
  for (let i = 0; i < 9; i++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => document.activeElement.name || document.activeElement.tagName)) }
  ok('フォームをキーボードだけで辿れる', seq.includes('contactName') && seq.includes('email') && seq.includes('features'))
  await p.evaluate(() => document.querySelector('#apply-form button[type="submit"]').focus())
  const outline = await p.evaluate(() => getComputedStyle(document.activeElement, ':focus-visible').outlineWidth)
  ok('送信ボタンにフォーカスできる', await p.evaluate(() => document.activeElement.type === 'submit'))
  await ctx.close()
}

await b.close()
console.log(results.join('\n'))
const failed = results.filter(r => r.startsWith(' FAIL')).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
