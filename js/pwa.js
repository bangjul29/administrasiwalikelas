/* ============================================================
 * pwa.js — Pasang aplikasi di HP (Android/iOS), service worker, indikator offline
 * ============================================================ */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var prompt_ = null, btn = $('btnInstall'), tip = $('pwaTip');

  // 1) Service worker (hanya di https / localhost)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function (e) { console.warn('SW gagal:', e); });
    });
  }

  function tampilTip(html) {
    if (!tip) return;
    tip.innerHTML = '<i class="bi bi-phone" style="font-size:22px;color:var(--p)"></i><div>' + html + '</div><button type="button" aria-label="Tutup">&times;</button>';
    tip.classList.add('on');
    tip.querySelector('button').onclick = function () { tip.classList.remove('on'); };
  }

  // 2) Tombol "Pasang"
  if (!standalone && btn) {
    window.addEventListener('beforeinstallprompt', function (e) {      // Android / Chrome / Edge
      e.preventDefault(); prompt_ = e; btn.classList.add('on');
    });
    if (iOS) btn.classList.add('on');                                   // iOS tidak punya event: tampilkan panduan
    btn.addEventListener('click', function () {
      if (prompt_) {
        prompt_.prompt();
        prompt_.userChoice.then(function (c) { if (c.outcome === 'accepted') btn.classList.remove('on'); prompt_ = null; });
      } else if (iOS) {
        tampilTip('<b>Pasang di iPhone/iPad</b>Buka lewat <b style="display:inline">Safari</b>, ketuk ikon <i class="bi bi-box-arrow-up"></i> <b style="display:inline">Bagikan</b>, lalu pilih <b style="display:inline">Tambahkan ke Layar Utama</b>.');
      } else {
        tampilTip('<b>Pasang aplikasi</b>Buka menu browser (&#8942;) lalu pilih <b style="display:inline">Instal aplikasi</b> atau <b style="display:inline">Tambahkan ke layar utama</b>.');
      }
    });
    window.addEventListener('appinstalled', function () { btn.classList.remove('on'); if (tip) tip.classList.remove('on'); });
  }

  // 3) Indikator offline
  var off = $('netOff');
  function net() { if (off) off.classList.toggle('on', !navigator.onLine); }
  window.addEventListener('online', net); window.addEventListener('offline', net); net();
})();
