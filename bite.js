"use strict";
/* FishCast — Punteggio di morso: unisce solunare, luce, onda, vento, pressione e marea
   in un voto orario, e lo aggrega in un voto giornaliero per il calendario.
   Dipende da solunar.js (window.Solunar) e da wx.js (window.FishCastWx).

   ONESTA' INTELLETTUALE: non e' una previsione di catture ne' un modello validato.
   E' una somma pesata di regole pratiche della pesca DA RIVA, dichiarate qui sotto in
   chiaro e mostrate all'utente voce per voce, cosi' puo' giudicare da se' invece di
   fidarsi di un numero opaco:
     - solunare 30 punti: periodi maggiori (Luna allo zenit/nadir) e minori (levata/tramonto)
     - luce      20 punti: alba e tramonto le ore migliori, notte buona, mezzogiorno la peggiore
     - onda      20 punti: da riva il mare "giusto" e' 0,3-0,8 m; piatto scarso, oltre 1,8 m
                           impescabile e pericoloso
     - vento     15 punti: 5-12 nodi ottimale; oltre 18 il lancio si rovina, oltre 25 si smette
     - pressione 10 punti: in calo (fronte in arrivo) meglio che in aumento
     - marea      5 punti: acqua in movimento meglio dell'acqua ferma
   Totale 100. Le soglie sono opinabili: sono raccolte dalla pratica del surfcasting
   tirrenico, non da uno studio scientifico. */
(function () {

  const T = (k, d) => (window.I18N && window.I18N.t ? window.I18N.t(k) : d) || d;
  const el = id => document.getElementById(id);
  const pad = n => (n < 10 ? '0' : '') + n;
  const hhmm = d => d ? pad(d.getHours()) + ':' + pad(d.getMinutes()) : '–';

  // ------------------------------------------------------------ MOTORE
  // Voci del punteggio per una singola ora. Ogni voce torna {p: punti, max: massimo, txt: spiegazione}
  function solPart(when, sol) {
    const t = when.getTime();
    for (const p of sol.periods) {
      if (t >= p.from.getTime() && t <= p.to.getTime()) {
        const what = p.major
          ? (p.t === sol.moon.transit ? T('sl.zenith', 'Luna allo zenit') : T('sl.nadir', 'Luna al nadir'))
          : (p.t === sol.moon.rise ? T('sl.moonrise', 'Luna sorge') : T('sl.moonset', 'Luna tramonta'));
        return { p: p.major ? 30 : 18, max: 30, txt: (p.major ? T('sl.major', 'Periodo maggiore') : T('sl.minor', 'Periodo minore')) + ' — ' + what };
      }
    }
    for (const p of sol.periods) {                       // appena fuori dalla finestra
      const d = Math.min(Math.abs(t - p.from.getTime()), Math.abs(t - p.to.getTime()));
      if (d <= 45 * 60000) return { p: 8, max: 30, txt: T('bi.nearperiod', 'Poco fuori da un periodo solunare') };
    }
    return { p: 0, max: 30, txt: T('bi.noperiod', 'Fuori dai periodi solunari') };
  }
  function lightPart(when, sol) {
    const t = when.getTime(), H = 3600000;
    const sr = sol.sun.rise ? sol.sun.rise.getTime() : null, ss = sol.sun.set ? sol.sun.set.getTime() : null;
    if (sr && Math.abs(t - sr) <= H) return { p: 20, max: 20, txt: T('bi.dawn', 'Prima luce: l\'ora migliore') };
    if (ss && Math.abs(t - ss) <= H) return { p: 20, max: 20, txt: T('bi.dusk', 'Tramonto: l\'ora migliore') };
    const night = (sr && ss) ? (t < sr - H || t > ss + H) : (when.getHours() < 6 || when.getHours() > 21);
    if (night) return { p: 13, max: 20, txt: T('bi.night', 'Notte: buona da riva') };
    return { p: 6, max: 20, txt: T('bi.day', 'Pieno giorno: la fascia peggiore') };
  }
  function wavePart(h) {
    if (h == null) return { p: 10, max: 20, txt: T('bi.nowave', 'Onda non disponibile qui') };
    const m = h.toFixed(1).replace('.', ',') + ' m';
    if (h < 0.15) return { p: 4, max: 20, txt: T('bi.flat', 'Mare piatto') + ' (' + m + ')' };
    if (h < 0.3) return { p: 11, max: 20, txt: T('bi.calmish', 'Poco mosso') + ' (' + m + ')' };
    if (h <= 0.8) return { p: 20, max: 20, txt: T('bi.ideal', 'Mare giusto da riva') + ' (' + m + ')' };
    if (h <= 1.2) return { p: 15, max: 20, txt: T('bi.lively', 'Mosso, ancora pescabile') + ' (' + m + ')' };
    if (h <= 1.8) return { p: 8, max: 20, txt: T('bi.rough', 'Molto mosso') + ' (' + m + ')' };
    return { p: 1, max: 20, txt: T('bi.storm', 'Mareggiata: impescabile e pericoloso') + ' (' + m + ')' };
  }
  function windPart(kn) {
    if (kn == null) return { p: 8, max: 15, txt: T('bi.nowind', 'Vento non disponibile') };
    const v = Math.round(kn) + ' kn';
    if (kn < 5) return { p: 12, max: 15, txt: T('bi.windcalm', 'Quasi calmo') + ' (' + v + ')' };
    if (kn <= 12) return { p: 15, max: 15, txt: T('bi.windgood', 'Brezza favorevole') + ' (' + v + ')' };
    if (kn <= 18) return { p: 10, max: 15, txt: T('bi.windfresh', 'Teso: lancio più difficile') + ' (' + v + ')' };
    if (kn <= 25) return { p: 4, max: 15, txt: T('bi.windstrong', 'Forte: si pesca male') + ' (' + v + ')' };
    return { p: 0, max: 15, txt: T('bi.windgale', 'Troppo vento') + ' (' + v + ')' };
  }
  function pressPart(dp) {
    if (dp == null) return { p: 6, max: 10, txt: T('bi.nopress', 'Pressione non disponibile') };
    const s = (dp > 0 ? '+' : '') + dp.toFixed(1) + ' hPa/3h';
    if (dp <= -1.5) return { p: 10, max: 10, txt: T('bi.pdrop', 'Pressione in calo netto') + ' (' + s + ')' };
    if (dp <= -0.5) return { p: 8, max: 10, txt: T('bi.pfall', 'Pressione in calo') + ' (' + s + ')' };
    if (dp < 0.5) return { p: 6, max: 10, txt: T('bi.psteady', 'Pressione stabile') + ' (' + s + ')' };
    if (dp < 1.5) return { p: 4, max: 10, txt: T('bi.prise', 'Pressione in aumento') + ' (' + s + ')' };
    return { p: 2, max: 10, txt: T('bi.pjump', 'Pressione in forte aumento') + ' (' + s + ')' };
  }
  function tidePart(dh) {
    if (dh == null) return { p: 3, max: 5, txt: T('bi.notide', 'Marea non disponibile') };
    const a = Math.abs(dh);
    if (a >= 0.06) return { p: 5, max: 5, txt: T('bi.tidefast', 'Marea in movimento deciso') };
    if (a >= 0.03) return { p: 4, max: 5, txt: T('bi.tidemove', 'Marea in movimento') };
    if (a >= 0.015) return { p: 3, max: 5, txt: T('bi.tideslow', 'Marea lenta') };
    return { p: 1, max: 5, txt: T('bi.tideslack', 'Acqua ferma (stanca)') };
  }

  // Punteggio di un'ora. wxAt = {wave, wind, dp, dTide} (valori gia' estratti), sol = giorno solunare.
  // ATTENZIONE al tetto di sicurezza: la somma pesata da sola, con Luna e alba a favore, dava un voto
  // "discreto" anche con mareggiata e 30 nodi. Da riva quello non e' un voto basso: e' un giorno in cui
  // NON si va. Se il mare e' impraticabile il totale viene tagliato e la condizione dichiarata.
  function hourScore(when, sol, wxAt) {
    const parts = [
      solPart(when, sol), lightPart(when, sol),
      wavePart(wxAt ? wxAt.wave : null), windPart(wxAt ? wxAt.wind : null),
      pressPart(wxAt ? wxAt.dp : null), tidePart(wxAt ? wxAt.dTide : null)
    ];
    let total = parts.reduce((s, x) => s + x.p, 0);
    let danger = null;
    const wv = wxAt ? wxAt.wave : null, wd = wxAt ? wxAt.wind : null;
    if (wv != null && wv > 2.5) { total = Math.min(total, 12); danger = T('bi.cap_storm', 'Mare troppo grosso: non si pesca da riva'); }
    else if (wv != null && wv > 1.8) { total = Math.min(total, 25); danger = T('bi.cap_rough', 'Mareggiata: riva pericolosa'); }
    if (wd != null && wd > 25) { total = Math.min(total, 25); danger = danger || T('bi.cap_wind', 'Vento troppo forte per lanciare'); }
    return { total: Math.round(total), parts: parts, hasWx: !!wxAt, danger: danger };
  }
  const label = s => s >= 78 ? T('bi.excellent', 'ottimo') : s >= 62 ? T('bi.good', 'buono')
    : s >= 47 ? T('bi.fair', 'discreto') : s >= 32 ? T('bi.poor', 'modesto') : T('bi.bad', 'scarso');
  const starsOf = s => Math.max(0.5, Math.round(s / 20 * 2) / 2);
  const starStr = n => '★'.repeat(Math.floor(n)) + (n % 1 >= 0.5 ? '☆' : '');

  // Estrae i valori meteo dell'ora richiesta dal pacchetto di wx.js (null se fuori copertura)
  function wxAtHour(d, when) {
    if (!d || !d.f || !d.f.hourly) return null;
    const key = when.getFullYear() + '-' + pad(when.getMonth() + 1) + '-' + pad(when.getDate()) + 'T' + pad(when.getHours()) + ':00';
    const fh = d.f.hourly, i = fh.time.indexOf(key);
    if (i < 0) return null;                                  // oltre l'orizzonte della previsione
    const mh = (d.m && d.m.hourly) ? d.m.hourly : null;
    const j = mh ? mh.time.indexOf(key) : -1;
    const sl = (j >= 0 && mh.sea_level_height_msl) ? mh.sea_level_height_msl : null;
    let dTide = null;
    if (sl && j >= 0 && sl[j] != null) {
      if (j > 0 && sl[j - 1] != null) dTide = sl[j] - sl[j - 1];
      else if (sl[j + 1] != null) dTide = sl[j + 1] - sl[j];      // prima ora della serie: differenza in avanti
    }
    const p0 = fh.surface_pressure[i], p3 = fh.surface_pressure[Math.max(0, i - 3)];
    return {
      wave: (j >= 0 && mh.wave_height) ? mh.wave_height[j] : null,
      wind: fh.wind_speed_10m[i],
      dp: (p0 != null && p3 != null) ? p0 - p3 : null,
      dTide: dTide
    };
  }

  // Voto della GIORNATA: media delle 4 ore migliori (una giornata vale per la sua finestra buona,
  // non per la media di 24 ore in cui si dorme).
  function dayScore(date, lat, lon, wxData) {
    const sol = window.Solunar.day(date, lat, lon);
    const hours = [];
    for (let h = 0; h < 24; h++) {
      const when = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 0, 0, 0);
      hours.push({ when: when, s: hourScore(when, sol, wxAtHour(wxData, when)) });
    }
    const top = hours.map(x => x.s.total).sort((a, b) => b - a).slice(0, 4);
    const avg = Math.round(top.reduce((a, b) => a + b, 0) / top.length);
    // voto delle sole componenti astronomiche (solunare 30 + luce 20), riportato su 100:
    // oltre i giorni coperti dalla previsione e' l'unica cosa che sappiamo davvero
    const astroTop = hours.map(x => (x.s.parts[0].p + x.s.parts[1].p) / 50 * 100).sort((a, b) => b - a).slice(0, 4);
    const astro = Math.round(astroTop.reduce((a, b) => a + b, 0) / astroTop.length);
    return { date: date, sol: sol, hours: hours, total: avg, astro: astro, hasWx: hours.some(x => x.s.hasWx) };
  }

  // Finestre migliori: ore consecutive sopra soglia, dalla piu' forte
  function bestWindows(hours, fromTime, minScore, maxOut) {
    const res = [];
    let cur = null;
    hours.forEach(h => {
      const ok = h.s.total >= minScore && h.when.getTime() + 3600000 > fromTime;
      if (ok) { if (!cur) cur = { from: h.when, to: new Date(h.when.getTime() + 3600000), sum: h.s.total, n: 1, best: h };
                else { cur.to = new Date(h.when.getTime() + 3600000); cur.sum += h.s.total; cur.n++; if (h.s.total > cur.best.s.total) cur.best = h; } }
      else if (cur) { res.push(cur); cur = null; }
    });
    if (cur) res.push(cur);
    res.forEach(w => w.avg = Math.round(w.sum / w.n));
    return res.sort((a, b) => b.avg - a.avg).slice(0, maxOut || 3);
  }

  window.FishCastBite = {
    hourScore: hourScore, dayScore: dayScore, wxAtHour: wxAtHour,
    bestWindows: bestWindows, label: label, stars: starsOf, starStr: starStr, render: render
  };

  // ------------------------------------------------------------ INTERFACCIA (dentro il pannello Meteo)
  const css = document.createElement('style');
  css.textContent = `
  #biteBox{margin-bottom:10px}
  .biHead{display:flex;align-items:center;gap:11px;background:#0c1c2e;border:1px solid #1f3650;border-radius:12px;padding:10px 12px}
  .biDial{width:56px;height:56px;flex:0 0 56px}
  .biHead .bt{flex:1;min-width:0}
  .biHead .bt b{display:block;font-size:15px;color:#eafcff}
  .biHead .bt .st{color:#ffd23a;letter-spacing:1px;font-size:14px}
  .biHead .bt span{display:block;font-size:11.5px;color:#8fb0cc;line-height:1.5}
  .biWin{display:flex;align-items:center;gap:8px;background:#0c1c2e;border:1px solid #1f3650;border-radius:10px;padding:7px 10px;margin-top:5px;font-size:12.5px}
  .biWin.top{border-color:#8dff3a66}
  .biWin b{color:#eafcff;white-space:nowrap}
  .biWin .sc{margin-left:auto;color:#ffd23a;font-size:12px;white-space:nowrap}
  #biWhy{margin-top:6px;background:#0c1c2e;border:1px solid #1f3650;border-radius:10px;padding:8px 11px;display:none}
  #biWhy .r{display:flex;gap:8px;font-size:12px;padding:3px 0;border-bottom:1px solid #14283e}
  #biWhy .r:last-child{border-bottom:none}
  #biWhy .r i{font-style:normal;color:#8fb0cc;flex:1}
  #biWhy .r b{color:#16e0ff;white-space:nowrap}
  #biWhyBtn{background:none;border:none;color:#16e0ff;font-size:12px;cursor:pointer;padding:5px 0;text-decoration:underline}
  #biCv{display:block;width:100%;height:74px;background:#08182a;border:1px solid #1f3650;border-radius:10px;margin-top:7px}
  .biLbl{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#8fb0cc;margin:9px 2px 3px;font-weight:600}
  .biNote{font-size:9.5px;color:#6f8ba0;margin-top:6px;line-height:1.5}
  .biDanger{margin-top:6px;background:#3a1a14;border:1px solid #ff6b6b;color:#ffb0a8;border-radius:9px;padding:7px 10px;font-size:12px}
  `;
  document.head.appendChild(css);

  function render(d) {
    const box = el('biteBox');
    if (!box || !window.Solunar) return;
    const now = new Date();
    const lat = d.lat, lon = d.lon;

    // ore di oggi e domani (l'orizzonte utile del punteggio)
    const days = [window.Solunar.day(now, lat, lon), window.Solunar.day(new Date(now.getTime() + 86400000), lat, lon)];
    const hours = [];
    days.forEach(sol => {
      for (let h = 0; h < 24; h++) {
        const when = new Date(sol.date.getFullYear(), sol.date.getMonth(), sol.date.getDate(), h, 0, 0, 0);
        hours.push({ when: when, s: hourScore(when, sol, wxAtHour(d, when)) });
      }
    });
    const iNow = hours.findIndex(h => h.when.getHours() === now.getHours() && h.when.getDate() === now.getDate());
    const cur = hours[iNow < 0 ? 0 : iNow];
    const wins = bestWindows(hours, now.getTime(), 60, 3);

    box.innerHTML =
      '<div class="biHead"><canvas class="biDial" id="biDial" width="112" height="112"></canvas>' +
      '<div class="bt"><b>' + T('bi.now', 'Morso adesso') + ': ' + cur.s.total + '/100 · ' + label(cur.s.total) + '</b>' +
      '<span class="st">' + starStr(starsOf(cur.s.total)) + '</span>' +
      '<span>' + (cur.s.hasWx ? T('bi.withwx', 'solunare + mare e meteo') : T('bi.solonly', 'solo solunare: manca il meteo')) + '</span></div></div>' +
      (cur.s.danger ? '<div class="biDanger">&#9888; ' + cur.s.danger + '</div>' : '') +
      '<button id="biWhyBtn">' + T('bi.why', 'Perché questo voto?') + '</button>' +
      '<div id="biWhy">' + cur.s.parts.map(p =>
        '<div class="r"><i>' + p.txt + '</i><b>+' + p.p + '/' + p.max + '</b></div>').join('') + '</div>' +
      '<div class="biLbl">' + T('bi.windows', 'Finestre migliori (48 h)') + '</div>' +
      (wins.length ? wins.map((w, k) =>
        '<div class="biWin' + (k === 0 ? ' top' : '') + '"><b>' + dayLbl(w.from, now) + ' ' + hhmm(w.from) + '–' + hhmm(w.to) + '</b>' +
        '<span style="color:#8fb0cc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + w.best.s.parts[0].txt + '</span>' +
        '<span class="sc">' + w.avg + '/100</span></div>').join('')
        : '<div class="biWin">' + T('bi.nowindow', 'Nessuna finestra sopra 60/100 nelle prossime 48 h') + '</div>') +
      '<canvas id="biCv" width="900" height="148"></canvas>' +
      '<div class="biNote">' + T('bi.note', 'Stima da regole pratiche di pesca da riva e teoria solunare (solunare 30, luce 20, onda 20, vento 15, pressione 10, marea 5). Non è una previsione di catture.') + '</div>';

    el('biWhyBtn').onclick = () => {
      const w = el('biWhy'); w.style.display = w.style.display === 'block' ? 'none' : 'block';
    };
    drawDial(cur.s.total);
    drawBars(hours, now);
  }
  function dayLbl(d, now) {
    return d.getDate() === now.getDate() ? T('sl.today_s', 'oggi')
      : (d.getDate() === new Date(now.getTime() + 86400000).getDate() ? T('sl.tomorrow', 'Domani').toLowerCase() : pad(d.getDate()) + '/' + pad(d.getMonth() + 1));
  }
  const scoreColor = s => s >= 78 ? '#8dff3a' : s >= 62 ? '#c6f24a' : s >= 47 ? '#ffd23a' : s >= 32 ? '#ff9f4a' : '#ff6b6b';

  function drawDial(score) {
    const cv = el('biDial'); if (!cv) return;
    const g = cv.getContext('2d'), S = cv.width, R = S / 2 - 9, cx = S / 2, cy = S / 2;
    g.clearRect(0, 0, S, S);
    g.lineWidth = 11; g.lineCap = 'round';
    g.strokeStyle = '#1b3b55'; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, 1.5 * Math.PI); g.stroke();
    g.strokeStyle = scoreColor(score); g.beginPath();
    g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * Math.max(0.02, score / 100)); g.stroke();
    g.fillStyle = '#eafcff'; g.font = 'bold 30px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(score), cx, cy + 1);
  }
  function drawBars(hours, now) {
    const cv = el('biCv'); if (!cv) return;
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, padL = 6, padR = 6, padT = 6, padB = 18;
    const pw = W - padL - padR, ph = H - padT - padB;
    g.clearRect(0, 0, W, H);
    const n = hours.length, bw = pw / n;
    hours.forEach((h, k) => {
      const x = padL + k * bw, hh = ph * Math.max(0.03, h.s.total / 100);
      g.fillStyle = scoreColor(h.s.total);
      g.globalAlpha = h.when.getTime() + 3600000 < now.getTime() ? 0.28 : 1;   // ore passate in trasparenza
      g.fillRect(x + 0.6, padT + ph - hh, Math.max(1.5, bw - 1.2), hh);
    });
    g.globalAlpha = 1;
    g.fillStyle = '#6f8ba0'; g.font = '12px system-ui'; g.textAlign = 'center';
    hours.forEach((h, k) => {
      if (h.when.getHours() % 6) return;
      const x = padL + k * bw + bw / 2;
      g.fillText(pad(h.when.getHours()), x, H - 5);
      if (h.when.getHours() === 0) { g.strokeStyle = '#24425f'; g.beginPath(); g.moveTo(x - bw / 2, padT); g.lineTo(x - bw / 2, padT + ph); g.stroke(); }
    });
    const t0 = hours[0].when.getTime(), frac = (now.getTime() - t0) / (n * 3600000);
    if (frac >= 0 && frac <= 1) {
      const x = padL + pw * frac;
      g.strokeStyle = '#ffd23a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, padT - 2); g.lineTo(x, padT + ph + 2); g.stroke();
    }
  }
})();
