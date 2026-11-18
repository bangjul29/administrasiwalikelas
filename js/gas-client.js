/* ============================================================
 * gas-client.js — Penghubung frontend ke backend GAS (REST JSON)
 * Menggantikan google.script.run tanpa mengubah logika aplikasi.
 *
 *  - POST text/plain (anti-preflight CORS GAS), token di BODY (bukan URL)
 *  - Dedup permintaan baca kembar (in-flight) + epoch tulis
 *  - Retry otomatis HANYA untuk pembacaan (aman diulang), tidak untuk tulis
 *  - Timeout per jenis aksi; respons non-JSON diterjemahkan jadi pesan jelas
 *  - Pemanasan server (ping) saat layar masuk, agar login pertama tidak dingin
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.APP_CONFIG || {};
  var URL_ = String(CFG.GAS_URL || '');
  var BACA = { boot: 1, daftarAkun: 1, rekapSekolah: 1, adminBoot: 1 };           // aman diulang
  var BERAT = { unggahProfil: 1, unggahRapot: 1, unggahBerkasSiswa: 1, unggahDokMasalah: 1, imporPaket: 1, buatPdf: 1, unduhBerkas: 1, simpanFoto: 1 };
  var inflight = {}, epoch = 0;

  function urlSiap() {
    if (!/^https:\/\/script\.google\.com\/(macros\/s\/|a\/)/.test(URL_))
      throw new Error('GAS_URL belum diisi. Buka js/config.js lalu tempel URL Web App (/exec).');
  }

  function kirim(body, ms) {
    urlSiap();
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, ms);
    return fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // WAJIB text/plain: application/json memicu preflight yang ditolak GAS
      body: JSON.stringify(body), signal: ctl.signal, redirect: 'follow', credentials: 'omit'
    }).then(function (res) {
      return res.text().then(function (txt) {
        try { return JSON.parse(txt); }
        catch (e) {
          throw new Error(res.ok
            ? 'Server mengirim respons tak terduga. Pastikan deployment GAS: Execute as "Me" dan akses "Anyone", lalu pakai versi terbaru.'
            : 'Server bermasalah (kode ' + res.status + '). Coba lagi sebentar lagi.');
        }
      });
    }).catch(function (e) {
      if (e && e.name === 'AbortError') throw new Error('Server tidak merespons. Coba lagi.');
      if (e instanceof TypeError) throw new Error('Koneksi gagal. Periksa internet Anda.');
      throw e;
    }).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
  }

  function tidur(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /** Inti: panggil fungsi lewat pintu tunggal api(). Mengembalikan Promise<{ok,data|msg,sesi,ver,ms}>. */
  function gasCall(fn, args, asId, ver, token) {
    var body = { action: 'api', tk: token || '', fn: fn, args: args || [], as: asId || '', ver: ver || '' };
    return panggil(body, !!BACA[fn], !!BERAT[fn]);
  }

  function panggil(body, baca, berat) {
    var ms = berat ? 150000 : 40000, k = null;
    if (!baca && body.action === 'api') epoch++;                 // tulis: putus berbagi permintaan baca lama
    if (baca) { k = epoch + '|' + JSON.stringify(body); if (inflight[k]) return inflight[k]; }
    var p = (function coba(n) {
      return kirim(body, ms).catch(function (e) {
        if (baca && n < 2 && /Koneksi|tidak merespons/.test(e.message)) return tidur(n ? 1200 : 500).then(function () { return coba(n + 1); });
        throw e;
      });
    })(0);
    if (k) { inflight[k] = p; var bersih = function () { delete inflight[k]; }; p.then(bersih, bersih); }
    return p;
  }

  /**
   * Adaptor kompatibel google.script.run:
   *   gasRun().withSuccessHandler(f).withFailureHandler(g).api(token, fn, args, asId, ver)
   *   gasRun().masuk(id, pw) / .daftar(o) / .lupaPassword(id)
   */
  function gasRun() {
    var ok = function () {}, bad = function () {};
    var b = new Proxy({}, {
      get: function (_, name) {
        if (name === 'withSuccessHandler') return function (f) { ok = f; return b; };
        if (name === 'withFailureHandler') return function (f) { bad = f; return b; };
        return function () {
          var a = Array.prototype.slice.call(arguments), p;
          try {
            p = String(name) === 'api'
              ? gasCall(a[1], a[2], a[3], a[4], a[0])
              : panggil({ action: String(name), args: a }, false, false);
          } catch (e) { p = Promise.reject(e); }
          p.then(function (r) { ok(r); }, function (e) { bad(e); });
        };
      }
    });
    return b;
  }

  /** Bangunkan container GAS lebih awal (hanya bila belum login) supaya klik "Masuk" pertama tidak menunggu cold start. */
  function ping() {
    try { urlSiap(); fetch(URL_ + '?action=ping', { credentials: 'omit', cache: 'no-store' }).catch(function () {}); } catch (e) {}
  }
  try {
    if (!localStorage.getItem('wk_tk')) (window.requestIdleCallback || function (f) { setTimeout(f, 300); })(ping);
  } catch (e) {}

  window.gasCall = gasCall; window.gasRun = gasRun; window.gasPing = ping;
})();
