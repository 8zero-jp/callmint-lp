/**
 * 広告LPのクライアントJS。
 *
 * ここは**文字列のまま**HTMLへ埋め込む（テンプレート補間をしない）。
 * ページ固有の値は build.mjs が `window.__MOYO_LP__` として先に流し込む。
 *
 * 個人情報の扱い（重要）
 *   氏名・メール・電話・サロン名は **計測イベントに一切載せない**。
 *   ピクセル／PostHog へ送るのは LP種別・CTA位置・UTM・件数だけ。
 */
export const CLIENT_JS = String.raw`
(function () {
  'use strict';
  var CFG = window.__MOYO_LP__ || {};
  var EV = CFG.events || {};
  var STORE_KEY = 'moyo_lp_attr';

  /* ---------- 流入情報（UTM・初回流入URL）を保持する ---------- */
  // 初回流入を勝ち（first-touch）にする。2回目以降の訪問では上書きしない。
  function readStored() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeStored(v) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch (e) { /* private mode 等 */ }
  }

  function currentUtm() {
    var out = {};
    var q;
    try { q = new URLSearchParams(window.location.search); } catch (e) { return out; }
    (CFG.utmKeys || []).forEach(function (k) {
      var v = q.get(k);
      if (v) out[k] = String(v).slice(0, 200);
    });
    return out;
  }

  var attr = (function () {
    var now = currentUtm();
    var stored = readStored();
    // UTM が付いた新しい流入なら、その回を「初回流入」として記録し直す。
    // UTM 無しの再訪では既存の記録を保つ（広告経由の帰属を消さない）。
    if (!stored || Object.keys(now).length > 0) {
      var next = {
        utm: now,
        landing_url: window.location.href.slice(0, 500),
        referrer: (document.referrer || '').slice(0, 300),
        first_seen: new Date().toISOString()
      };
      if (stored && Object.keys(now).length === 0) next = stored;
      writeStored(next);
      return next;
    }
    return stored;
  })();

  /** 計測イベントに載せてよい情報だけを組み立てる（PIIは入れない） */
  function baseProps() {
    var p = { lp: CFG.lp, lp_title: CFG.lpTitle, landing_url: attr.landing_url };
    var u = attr.utm || {};
    Object.keys(u).forEach(function (k) { p[k] = u[k]; });
    return p;
  }

  function track(name, props) {
    if (!name) return;
    var payload = baseProps();
    if (props) Object.keys(props).forEach(function (k) { payload[k] = props[k]; });
    try { if (window.posthog && window.posthog.capture) window.posthog.capture(name, payload); } catch (e) {}
  }

  // PostHog の全イベントに UTM と LP種別を付ける
  try {
    if (window.posthog && window.posthog.register) window.posthog.register(baseProps());
  } catch (e) {}

  track(EV.view);

  /* ---------- CTA クリック ---------- */
  // data-cta="hero" のように位置を持たせる。どのCTAが効いたかを比較できるようにする。
  document.addEventListener('click', function (e) {
    var t = e.target;
    var el = t && t.closest ? t.closest('[data-cta]') : null;
    if (!el) return;
    track(EV.ctaClick, { cta_position: el.getAttribute('data-cta') });
  }, { passive: true });

  /* ---------- モバイル固定CTA ---------- */
  // フォームとフッターが見えている間は退避させる（入力の邪魔をしない）。
  (function () {
    var bar = document.querySelector('.sticky');
    if (!bar || !('IntersectionObserver' in window)) return;
    var zones = [].slice.call(document.querySelectorAll('[data-cta-park]'));
    if (!zones.length) return;
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target);
      });
      bar.classList.toggle('is-parked', visible.size > 0);
    }, { rootMargin: '0px 0px -10% 0px' });
    zones.forEach(function (z) { io.observe(z); });
  })();

  /* ---------- 申込みフォーム ---------- */
  var form = document.getElementById('apply-form');
  if (!form) return;

  var statusEl = document.getElementById('form-status');
  var submitBtn = form.querySelector('[type="submit"]');
  var sending = false;
  var started = false;

  form.addEventListener('input', onFirstTouch, true);
  form.addEventListener('focusin', onFirstTouch);
  function onFirstTouch() {
    if (started) return;
    started = true;
    track(EV.formStart);
  }

  function setError(name, msg) {
    var field = form.querySelector('[name="' + name + '"]');
    var box = document.getElementById('err-' + name);
    if (box) box.textContent = msg || '';
    if (field) {
      if (msg) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }
    return !msg;
  }

  function value(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el && typeof el.value === 'string' ? el.value.trim() : '';
  }

  function checkedFeatures() {
    return [].slice.call(form.querySelectorAll('input[name="features"]:checked'))
      .map(function (el) { return { value: el.value, label: el.getAttribute('data-label') || el.value }; });
  }

  function validate() {
    var ok = true;
    ok = setError('salonName', value('salonName') ? '' : 'サロン名を入力してください') && ok;
    ok = setError('contactName', value('contactName') ? '' : 'ご担当者名を入力してください') && ok;

    var email = value('email');
    var emailMsg = !email ? 'メールアドレスを入力してください'
      : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'メールアドレスの形式が正しくありません');
    ok = setError('email', emailMsg) && ok;

    var phone = value('phone');
    var digits = phone.replace(/[^0-9]/g, '');
    var phoneMsg = !phone ? '電話番号を入力してください'
      : (digits.length >= 10 && digits.length <= 11 ? '' : '電話番号は10桁または11桁で入力してください');
    ok = setError('phone', phoneMsg) && ok;

    ok = setError('salonCount', value('salonCount') ? '' : '店舗数を選択してください') && ok;
    ok = setError('staffCount', value('staffCount') ? '' : 'スタッフ数を選択してください') && ok;

    var feats = checkedFeatures();
    var fbox = document.getElementById('err-features');
    if (fbox) fbox.textContent = feats.length ? '' : '興味のある機能を1つ以上選択してください';
    if (!feats.length) ok = false;

    var consent = form.querySelector('[name="consent"]');
    var cbox = document.getElementById('err-consent');
    var consentOk = !!(consent && consent.checked);
    if (cbox) cbox.textContent = consentOk ? '' : '利用規約とプライバシーポリシーへの同意が必要です';
    if (!consentOk) ok = false;

    return ok;
  }

  /** 既存の contact_inquiries は列が固定なので、追加項目は message にまとめて残す */
  function buildMessage(feats) {
    var u = attr.utm || {};
    var lines = [
      '【広告LPからのお申し込み】',
      'LP: ' + CFG.lpTitle + ' (' + CFG.lp + ')',
      'キャンペーン: ' + CFG.campaign,
      '',
      '店舗数: ' + value('salonCount'),
      'スタッフ数: ' + value('staffCount'),
      '希望機能: ' + feats.map(function (f) { return f.label; }).join(' / '),
      '',
      'ご要望: ' + (value('message') || '（未記入）'),
      '',
      '--- 流入情報 ---',
      '初回流入URL: ' + (attr.landing_url || ''),
      'リファラ: ' + (attr.referrer || '（なし）')
    ];
    (CFG.utmKeys || []).forEach(function (k) {
      lines.push(k + ': ' + (u[k] || '（なし）'));
    });
    lines.push('CTA位置: ' + (form.getAttribute('data-cta-origin') || '（不明）'));
    return lines.join('\n');
  }

  function showStatus(kind, msg) {
    if (!statusEl) return;
    statusEl.className = 'form-status form-status--' + kind;
    statusEl.textContent = msg;
    statusEl.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;            // 二重送信防止（連打）

    if (!validate()) {
      track(EV.formError, { reason: 'validation' });
      var bad = form.querySelector('[aria-invalid="true"], .err:not(:empty)');
      var focusTarget = form.querySelector('[aria-invalid="true"]');
      if (focusTarget && focusTarget.focus) focusTarget.focus();
      else if (bad && bad.scrollIntoView) bad.scrollIntoView({ block: 'center' });
      showStatus('ng', '入力内容をご確認ください。');
      return;
    }

    // ハニーポット: 人間は触らない隠しフィールド。埋まっていたら黙って成功扱い。
    if (value('website')) { renderDone(); return; }

    var feats = checkedFeatures();
    sending = true;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '送信中…'; }
    if (statusEl) statusEl.hidden = true;
    track(EV.formSubmit, { feature_count: feats.length, features: feats.map(function (f) { return f.value; }) });

    fetch(CFG.contactApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salonName: value('salonName'),
        contactName: value('contactName'),
        email: value('email'),
        phone: value('phone'),
        message: buildMessage(feats),
        website: ''
      })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j && j.error ? j.error : '送信に失敗しました');
        });
      }
      track(EV.formSuccess, { feature_count: feats.length, features: feats.map(function (f) { return f.value; }) });
      // ピクセルへは個人情報を送らない。LP種別だけ。
      try { if (window.fbq) window.fbq('track', 'Lead', { content_name: CFG.lp }); } catch (e) {}
      renderDone();
    }).catch(function (err) {
      sending = false;
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = CFG.submitLabel; }
      track(EV.formError, { reason: 'network_or_server' });
      showStatus('ng', '送信に失敗しました。お手数ですが時間をおいて再度お試しください。' + (err && err.message ? '（' + err.message + '）' : ''));
    });
  });

  function renderDone() {
    var box = document.getElementById('form-box');
    if (!box) return;
    box.innerHTML = '<div class="form-done"><h3>お申し込みありがとうございます</h3>'
      + '<p>担当者より2営業日以内にご連絡いたします。<br>この時点では料金は発生していません。</p></div>';
    box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
})();
`
