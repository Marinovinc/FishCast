"use strict";
/* FishCast — Meteo-marino & marea.
   Dipende da engine.js (usa la variabile globale `map` di Leaflet) e da i18n.js (opzionale).

   ============================ LICENZA / VENDIBILITA' ============================
   I DATI serviti qui sono liberamente riutilizzabili anche a fini commerciali
   (modelli ECMWF/DWD/GFS/MeteoFrance, CC BY 4.0) — l'attribuzione in fondo al
   pannello e' OBBLIGATORIA e non va rimossa.
   Il limite riguarda solo CHI OSPITA il servizio: l'endpoint pubblico open-meteo.com
   e' gratuito ma per USO NON COMMERCIALE. Quando l'app verra' venduta basta
   cambiare le due costanti qui sotto con una di queste alternative:
     1) istanza Open-Meteo self-hosted (software AGPLv3, gratuito) -> stessa identica API
     2) piano commerciale Open-Meteo -> https://customer-api.open-meteo.com/v1/...
     3) proxy proprio (es. Cloudflare Workers, piano free) che rilegge
        Copernicus Marine / Meteo-France / NOAA e restituisce lo stesso JSON
   Nessun'altra riga di codice dell'app va toccata.
   =============================================================================== */
(function () {

  // ---- UNICO PUNTO DI CONFIGURAZIONE (vedi nota licenza sopra) ----
  const WX_FORECAST = 'https://api.open-meteo.com/v1/forecast';
  const WX_MARINE = 'https://marine-api.open-meteo.com/v1/marine';
  const WX_TTL_MIN = 30;          // freschezza cache (minuti)
  const WX_CACHE_KEY = 'fc_wx_';  // + lat,lon arrotondati

  const T = (k, d) => (window.I18N && window.I18N.t ? window.I18N.t(k) : d) || d;
  const el = id => document.getElementById(id);
  const pad = n => (n < 10 ? '0' : '') + n;

  // ---------------- STILE ----------------
  const css = document.createElement('style');
  css.textContent = `
  #wxSheet{position:fixed;z-index:1310;left:0;right:0;bottom:0;max-width:680px;margin:0 auto;
    background:rgba(14,28,46,.98);border-top:1px solid #1f3650;border-radius:18px 18px 0 0;
    padding:12px 14px calc(env(safe-area-inset-bottom,0px) + 14px);box-shadow:0 -8px 32px #000b;
    max-height:86vh;overflow:auto;color:#dfeaf5;font-size:13px;display:none}
  #wxSheet .wxHd{display:flex;align-items:center;gap:8px;margin-bottom:9px}
  #wxSheet .wxHd b{color:#16e0ff;font-size:15px;flex:1}
  #wxSheet .wxHd .when{font-size:10.5px;color:#8fb0cc;text-align:right;line-height:1.3}
  #wxClose{background:none;border:none;color:#cfe0f2;font-size:20px;cursor:pointer;line-height:1;padding:0 2px}
  #wxWarn{background:#3a2a10;border:1px solid #7a5a18;color:#ffd68a;border-radius:9px;padding:7px 10px;font-size:11.5px;margin-bottom:9px;display:none}
  .wxGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:4px}
  .wxT{background:#0c1c2e;border:1px solid #1f3650;border-radius:10px;padding:7px 9px}
  .wxT .k{font-size:9.5px;color:#8fb0cc;text-transform:uppercase;letter-spacing:.3px}
  .wxT .v{font-size:16px;font-weight:700;color:#eafcff;line-height:1.25}
  .wxT .s{font-size:10.5px;color:#8fb0cc}
  .wxT .up{color:#8dff3a} .wxT .dn{color:#ff9bb0}
  .wxLbl{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#8fb0cc;margin:10px 2px 3px;font-weight:600}
  #wxCv,#wxTideCv{display:block;width:100%;background:#08182a;border:1px solid #1f3650;border-radius:10px}
  #wxCv{height:118px} #wxTideCv{height:86px}
  #wxTideTxt{font-size:11.5px;color:#cfe0f2;margin-top:5px}
  #wxTideTxt b{color:#16e0ff}
  .wxFoot{font-size:9.5px;color:#6f8ba0;margin-top:10px;line-height:1.5}
  .wxFoot a{color:#8fb0cc}
  #wxSpin{text-align:center;color:#8fb0cc;padding:16px;font-size:12.5px}
  `;
  document.head.appendChild(css);

  // ---------------- DOM ----------------
  const sheet = document.createElement('div');
  sheet.id = 'wxSheet';
  sheet.innerHTML =
    '<div class="wxHd"><b>&#127754; ' + T('wx.title', 'Meteo-marino') + '</b>' +
    '<span class="when" id="wxWhen"></span><button id="wxClose" title="Chiudi">&#10005;</button></div>' +
    '<div id="wxWarn"></div>' +
    '<div id="wxSpin">' + T('wx.loading', 'Carico i dati…') + '</div>' +
    '<div id="wxBody" style="display:none">' +
    '<div class="wxGrid" id="wxNow"></div>' +
    '<div class="wxLbl">' + T('wx.chart', 'Vento e onda — 48 h') +
    ' <span style="color:#16e0ff">— ' + T('wx.wave', 'Onda') + '</span>' +
    ' <span style="color:#8dff3a">— ' + T('wx.wind', 'Vento') + '</span>' +
    ' <span style="color:#ffd68a">·· ' + T('wx.gust', 'Raffica') + '</span></div>' +
    '<canvas id="wxCv" width="900" height="236"></canvas>' +
    '<div class="wxLbl">' + T('wx.tide', 'Marea — livello del mare') + '</div>' +
    '<canvas id="wxTideCv" width="900" height="172"></canvas>' +
    '<div id="wxTideTxt"></div>' +
    '<div class="wxFoot">' + T('wx.src', 'Dati meteo e marini: Open-Meteo (CC BY 4.0) — modelli ECMWF, DWD, GFS, Météo-France. Previsione: non usare per la navigazione.') + '</div>' +
    '</div>';
  document.body.appendChild(sheet);
  el('wxClose').onclick = () => { sheet.style.display = 'none'; };

  // Pulsante: rail (mobile) oppure pannello comandi (desktop)
  const rail = el('rail');
  if (rail) {
    const b = document.createElement('button');
    b.className = 'railbtn'; b.id = 'btnWx';
    b.innerHTML = '&#127754;<small>' + T('rail.wx', 'Meteo') + '</small>';
    rail.appendChild(b);
  } else {
    const host = el('btnPrey') && el('btnPrey').parentNode;
    if (host) {
      const b = document.createElement('button');
      b.id = 'btnWx';
      b.style.cssText = 'width:100%;margin-top:5px;padding:6px;border-radius:7px;border:1px solid #16e0ff;background:#11243c;color:#16e0ff;font-weight:700;font-size:12px;cursor:pointer';
      b.innerHTML = '&#127754; ' + T('wx.title', 'Meteo-marino');
      host.insertBefore(b, el('btnPrey').nextSibling);
    }
  }
  if (el('btnWx')) el('btnWx').onclick = openWx;

  // ---------------- DATI ----------------
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  const cardEN = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function card(deg) {
    if (deg == null || !isFinite(deg)) return '–';
    const set = (window.I18N && window.I18N.lang === 'it') ? cardinals : cardEN;
    return set[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
  }
  // freccia che indica DOVE VA (i dati danno la direzione DI PROVENIENZA)
  function arrow(deg) {
    if (deg == null || !isFinite(deg)) return '';
    return '<span style="display:inline-block;transform:rotate(' + ((deg + 180) % 360) + 'deg)">↑</span>';
  }
  function nowKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':00';
  }
  function idxNow(times) {
    if (!times || !times.length) return 0;
    let i = times.indexOf(nowKey());
    if (i < 0) { // fallback: primo orario >= adesso
      const k = nowKey();
      i = times.findIndex(t => t >= k);
      if (i < 0) i = 0;
    }
    return i;
  }

  async function getJSON(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (j && j.error) throw new Error(j.reason || 'API error');
    return j;
  }

  // Il punto puo' cadere a terra: per il marino si prova il centro e, se fallisce, punti vicini verso il mare aperto.
  async function fetchMarine(lat, lon) {
    const q = (la, lo) => WX_MARINE + '?latitude=' + la.toFixed(4) + '&longitude=' + lo.toFixed(4) +
      '&hourly=wave_height,wave_period,wave_direction,wind_wave_height,swell_wave_height,sea_surface_temperature,sea_level_height_msl' +
      '&forecast_days=3&timezone=auto';
    try { return await getJSON(q(lat, lon)); }
    catch (e) {
      const off = [[0, .05], [0, -.05], [.05, 0], [-.05, 0], [0, .12], [-.12, 0], [.12, 0], [0, -.12]];
      for (const o of off) {
        try { return await getJSON(q(lat + o[0], lon + o[1])); } catch (e2) { /* prova il prossimo */ }
      }
      return null;   // nessun punto marino raggiungibile: si mostra solo l'atmosferico
    }
  }

  async function fetchWx(lat, lon) {
    const fUrl = WX_FORECAST + '?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4) +
      '&current=temperature_2m,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m' +
      '&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,surface_pressure,temperature_2m' +
      '&daily=sunrise,sunset&forecast_days=3&timezone=auto&wind_speed_unit=kn';
    const [f, m] = await Promise.all([getJSON(fUrl), fetchMarine(lat, lon)]);
    return { f: f, m: m, t: Date.now(), lat: lat, lon: lon };
  }

  function cacheKey(lat, lon) { return WX_CACHE_KEY + lat.toFixed(2) + ',' + lon.toFixed(2); }
  function readCache(lat, lon) {
    try { const s = localStorage.getItem(cacheKey(lat, lon)); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function writeCache(d) {
    try { localStorage.setItem(cacheKey(d.lat, d.lon), JSON.stringify(d)); } catch (e) { /* quota piena: pazienza */ }
  }

  // ---------------- APERTURA ----------------
  let busy = false;
  async function openWx() {
    if (busy) return;
    const c = map.getCenter();
    sheet.style.display = 'block';
    el('wxWarn').style.display = 'none';

    const cached = readCache(c.lat, c.lng);
    const fresh = cached && (Date.now() - cached.t) < WX_TTL_MIN * 60000;
    if (cached) { render(cached, !fresh); }
    else { el('wxSpin').style.display = 'block'; el('wxBody').style.display = 'none'; }
    if (fresh) return;

    busy = true;
    try {
      const d = await fetchWx(c.lat, c.lng);
      writeCache(d);
      render(d, false);
    } catch (e) {
      if (cached) {
        warn(T('wx.stale', 'Dati non aggiornati (sei offline o il servizio non risponde).') + ' — ' + fmtWhen(cached.t));
      } else {
        el('wxSpin').style.display = 'block';
        el('wxSpin').textContent = T('wx.err', 'Dati meteo non disponibili: serve la rete al primo caricamento.');
      }
    } finally { busy = false; }
  }
  function warn(msg) { const w = el('wxWarn'); w.textContent = '⚠ ' + msg; w.style.display = 'block'; }
  function fmtWhen(t) {
    const d = new Date(t);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  // ---------------- RENDER ----------------
  function render(d, stale) {
    el('wxSpin').style.display = 'none';
    el('wxBody').style.display = 'block';
    if (stale) warn(T('wx.stale', 'Dati non aggiornati (sei offline o il servizio non risponde).'));

    const f = d.f, m = d.m;
    const fh = f.hourly, i = idxNow(fh.time);
    const cur = f.current || {};
    const mh = m && m.hourly ? m.hourly : null;
    const mi = mh ? idxNow(mh.time) : 0;

    el('wxWhen').innerHTML = T('wx.updated', 'aggiornato') + ' ' + fmtWhen(d.t) +
      '<br>' + d.lat.toFixed(3) + ', ' + d.lon.toFixed(3);

    // --- pressione e trend (confronto con 3 ore fa) ---
    const p = cur.surface_pressure != null ? cur.surface_pressure : fh.surface_pressure[i];
    const p3 = fh.surface_pressure[Math.max(0, i - 3)];
    let dp = (p != null && p3 != null) ? p - p3 : 0;
    let trend = '→ ' + T('wx.steady', 'stabile'), tcl = '';
    if (dp <= -1) { trend = '↘ ' + T('wx.falling', 'in calo'); tcl = 'dn'; }
    else if (dp >= 1) { trend = '↗ ' + T('wx.rising', 'in aumento'); tcl = 'up'; }

    const wind = cur.wind_speed_10m != null ? cur.wind_speed_10m : fh.wind_speed_10m[i];
    const gust = cur.wind_gusts_10m != null ? cur.wind_gusts_10m : fh.wind_gusts_10m[i];
    const wdir = cur.wind_direction_10m != null ? cur.wind_direction_10m : fh.wind_direction_10m[i];
    const air = cur.temperature_2m != null ? cur.temperature_2m : fh.temperature_2m[i];

    const wh = mh ? mh.wave_height[mi] : null;
    const wp = mh ? mh.wave_period[mi] : null;
    const wd = mh ? mh.wave_direction[mi] : null;
    const sst = mh ? mh.sea_surface_temperature[mi] : null;

    const n1 = (v, u, dec) => v == null ? '–' : (dec ? v.toFixed(dec) : Math.round(v)) + u;
    const kmh = v => v == null ? '–' : Math.round(v * 1.852) + ' km/h';   // i nodi restano il dato primario (uso marino)

    el('wxNow').innerHTML =
      tile(T('wx.wind', 'Vento'), n1(wind, ' kn'), arrow(wdir) + ' ' + card(wdir) + ' · ' + kmh(wind)) +
      tile(T('wx.gust', 'Raffica'), n1(gust, ' kn'), kmh(gust)) +
      tile(T('wx.wave', 'Onda'), wh == null ? '–' : wh.toFixed(1) + ' m', wh == null ? T('wx.nosea', 'punto a terra') : (arrow(wd) + ' ' + card(wd) + ' · ' + n1(wp, ' s', 0))) +
      tile(T('wx.press', 'Pressione'), n1(p, ' hPa'), trend + ' (' + (dp > 0 ? '+' : '') + dp.toFixed(1) + ' / 3h)', tcl) +
      tile(T('wx.air', 'Aria'), n1(air, '°'), '') +
      tile(T('wx.sea', 'Mare'), n1(sst, '°', 1), sst == null ? '–' : T('wx.sst', 'temp. superficie'));

    drawChart(fh, mh, i, mi);
    drawTide(mh, mi);
  }
  function tile(k, v, s, cl) {
    return '<div class="wxT"><div class="k">' + k + '</div><div class="v ' + (cl || '') + '">' + v + '</div><div class="s">' + (s || '') + '</div></div>';
  }

  // --- grafico 48 h: onda (area) + vento (linea) + raffiche (tratteggio) ---
  function drawChart(fh, mh, i0, mi0) {
    const cv = el('wxCv'), g = cv.getContext('2d');
    const W = cv.width, H = cv.height, padL = 30, padR = 34, padT = 12, padB = 20;
    const pw = W - padL - padR, ph = H - padT - padB;
    g.clearRect(0, 0, W, H);
    const N = 48;
    const wind = [], gust = [], wave = [], hours = [];
    for (let k = 0; k < N; k++) {
      const i = i0 + k;
      wind.push(fh.wind_speed_10m[i] != null ? fh.wind_speed_10m[i] : null);
      gust.push(fh.wind_gusts_10m[i] != null ? fh.wind_gusts_10m[i] : null);
      wave.push(mh && mh.wave_height[mi0 + k] != null ? mh.wave_height[mi0 + k] : null);
      hours.push(fh.time[i] ? +fh.time[i].slice(11, 13) : null);
    }
    const maxW = Math.max(12, ...gust.filter(v => v != null).concat(wind.filter(v => v != null)));
    const maxH = Math.max(1, ...wave.filter(v => v != null));
    const X = k => padL + pw * k / (N - 1);
    const Yw = v => padT + ph - ph * (v / maxW);
    const Yh = v => padT + ph - ph * (v / maxH);

    // notte (dalle 20 alle 6) + griglia oraria
    g.fillStyle = 'rgba(255,255,255,.035)';
    for (let k = 0; k < N; k++) { const h = hours[k]; if (h != null && (h >= 20 || h < 6)) g.fillRect(X(k) - pw / (N - 1) / 2, padT, pw / (N - 1), ph); }
    g.strokeStyle = '#1b3b55'; g.lineWidth = 1; g.font = '11px system-ui'; g.textAlign = 'center';
    for (let k = 0; k < N; k++) {
      if (hours[k] == null || hours[k] % 6) continue;
      g.beginPath(); g.moveTo(X(k), padT); g.lineTo(X(k), padT + ph); g.stroke();
      g.fillStyle = '#6f8ba0'; g.fillText(pad(hours[k]), X(k), H - 6);
    }
    // onda: area
    if (wave.some(v => v != null)) {
      g.beginPath(); let started = false;
      for (let k = 0; k < N; k++) { if (wave[k] == null) continue; const x = X(k), y = Yh(wave[k]); if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y); }
      g.lineTo(X(N - 1), padT + ph); g.lineTo(X(0), padT + ph); g.closePath();
      g.fillStyle = 'rgba(22,224,255,.20)'; g.fill();
      g.beginPath(); started = false;
      for (let k = 0; k < N; k++) { if (wave[k] == null) continue; const x = X(k), y = Yh(wave[k]); if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y); }
      g.strokeStyle = '#16e0ff'; g.lineWidth = 2; g.stroke();
    }
    // raffiche (tratteggiate) e vento (linea piena)
    g.setLineDash([4, 4]); line(g, gust, X, Yw, '#ffd68a', 1.4); g.setLineDash([]);
    line(g, wind, X, Yw, '#8dff3a', 2);

    // assi: sinistra = onda (m), destra = vento (kn)
    g.textAlign = 'left'; g.fillStyle = '#16e0ff'; g.font = '11px system-ui';
    g.fillText(maxH.toFixed(1) + ' m', 3, padT + 9);
    g.textAlign = 'right'; g.fillStyle = '#8dff3a';
    g.fillText(Math.round(maxW) + ' kn', W - 3, padT + 9);   // la legenda dei colori sta nell'intestazione HTML, non sul canvas
  }
  function line(g, arr, X, Y, col, w) {
    g.beginPath(); let started = false;
    for (let k = 0; k < arr.length; k++) {
      if (arr[k] == null) continue;
      const x = X(k), y = Y(arr[k]);
      if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y);
    }
    g.strokeStyle = col; g.lineWidth = w; g.stroke();
  }

  // --- marea: curva del livello del mare + prossime alta/bassa ---
  function drawTide(mh, mi0) {
    const cv = el('wxTideCv'), g = cv.getContext('2d');
    const W = cv.width, H = cv.height, padL = 34, padR = 10, padT = 10, padB = 20;
    const pw = W - padL - padR, ph = H - padT - padB;
    g.clearRect(0, 0, W, H);
    const txt = el('wxTideTxt');
    if (!mh || !mh.sea_level_height_msl) {
      g.fillStyle = '#6f8ba0'; g.font = '13px system-ui'; g.textAlign = 'center';
      g.fillText(T('wx.notide', 'Marea non disponibile per questo punto'), W / 2, H / 2);
      txt.textContent = '';
      return;
    }
    const start = Math.max(0, mi0 - 3), N = 27;   // 3 h prima + 24 h avanti
    const v = [], hrs = [];
    for (let k = 0; k < N; k++) {
      const i = start + k;
      v.push(mh.sea_level_height_msl[i] != null ? mh.sea_level_height_msl[i] : null);
      hrs.push(mh.time[i] || null);
    }
    const ok = v.filter(x => x != null);
    if (!ok.length) { txt.textContent = ''; return; }
    let lo = Math.min(...ok), hi = Math.max(...ok);
    if (hi - lo < .12) { const c = (hi + lo) / 2; lo = c - .06; hi = c + .06; }   // scala minima: il Mediterraneo ha escursioni piccole
    const X = k => padL + pw * k / (N - 1);
    const Y = x => padT + ph - ph * (x - lo) / (hi - lo);

    // zero + curva
    g.strokeStyle = '#1b3b55'; g.lineWidth = 1; g.font = '11px system-ui';
    if (lo < 0 && hi > 0) { g.beginPath(); g.moveTo(padL, Y(0)); g.lineTo(W - padR, Y(0)); g.stroke(); }
    g.beginPath(); let st = false;
    for (let k = 0; k < N; k++) { if (v[k] == null) continue; const x = X(k), y = Y(v[k]); if (!st) { g.moveTo(x, y); st = true; } else g.lineTo(x, y); }
    g.lineTo(X(N - 1), padT + ph); g.lineTo(X(0), padT + ph); g.closePath();
    g.fillStyle = 'rgba(22,224,255,.18)'; g.fill();
    line(g, v, X, Y, '#16e0ff', 2);

    // adesso
    const kNow = 3;
    if (v[kNow] != null) {
      g.strokeStyle = '#ffd23a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(X(kNow), padT); g.lineTo(X(kNow), padT + ph); g.stroke();
      g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(X(kNow), Y(v[kNow]), 3.4, 0, 6.3); g.fill();
    }
    // etichette scala + orari
    g.fillStyle = '#6f8ba0'; g.textAlign = 'left';
    g.fillText(hi.toFixed(2) + ' m', 3, padT + 9);
    g.fillText(lo.toFixed(2) + ' m', 3, padT + ph);
    g.textAlign = 'center';
    for (let k = 0; k < N; k += 6) { if (!hrs[k]) continue; g.fillText(hrs[k].slice(11, 13), X(k), H - 5); }

    // estremi successivi
    const ext = [];
    for (let k = 1; k < N - 1; k++) {
      if (v[k] == null || v[k - 1] == null || v[k + 1] == null) continue;
      if (v[k] > v[k - 1] && v[k] >= v[k + 1]) ext.push({ k: k, hi: true });
      if (v[k] < v[k - 1] && v[k] <= v[k + 1]) ext.push({ k: k, hi: false });
    }
    const next = ext.filter(e => e.k > kNow).slice(0, 2);
    txt.innerHTML = next.length
      ? next.map(e => (e.hi ? '&#9650; ' + T('wx.high', 'alta') : '&#9660; ' + T('wx.low', 'bassa')) +
        ' <b>' + hrs[e.k].slice(11, 16) + '</b> (' + v[e.k].toFixed(2) + ' m)').join(' &nbsp;&middot;&nbsp; ')
      : T('wx.noext', 'nessun estremo nelle prossime 24 h');
    txt.innerHTML += ' <span style="color:#6f8ba0">&middot; ' + T('wx.tidenote', 'escursione mediterranea ridotta; valore modellato, non da mareografo') + '</span>';
  }

  window.FishCastWx = { open: openWx };   // apertura anche da altri punti dell'app
})();
