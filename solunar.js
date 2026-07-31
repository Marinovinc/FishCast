"use strict";
/* FishCast — Solunare, fasi lunari, alba/tramonto, sorgere/tramontare della Luna.
   TUTTO CALCOLATO IN LOCALE: nessuna API, nessuna chiave, nessun vincolo di licenza,
   funziona anche completamente offline.

   Effemeridi: metodo di Paul Schlyter (elementi orbitali + perturbazioni principali),
   accuratezza tipica ~1-2 primi d'arco per il Sole e ~2 primi per la Luna: piu' che
   sufficiente per orari di alba/tramonto/levata/culminazione (errore di pochi minuti).
   Criterio di levata/tramonto (Meeus): centro dell'astro a
     Sole  h0 = -0,833 deg   (rifrazione + semidiametro)
     Luna  h0 = 0,7275 * parallasse - 0,566 deg
   Le altezze sono geocentriche: la parallasse entra nella soglia, come da convenzione.

   Teoria solunare (John Alden Knight, 1926): l'attivita' dei pesci aumenta quando la
   Luna e' allo zenit o al nadir (periodi MAGGIORI, 2 h) e al suo sorgere/tramontare
   (periodi MINORI, 1 h). E' una regola empirica, NON una legge dimostrata: nel pannello
   va detto chiaramente. */
(function () {

  const RAD = Math.PI / 180, DEG = 180 / Math.PI;
  const SYN = 29.530588853;                 // mese sinodico (giorni)
  const T = (k, d) => (window.I18N && window.I18N.t ? window.I18N.t(k) : d) || d;
  const el = id => document.getElementById(id);
  const pad = n => (n < 10 ? '0' : '') + n;
  const rev = x => x - Math.floor(x / 360) * 360;
  const sin = x => Math.sin(x * RAD), cos = x => Math.cos(x * RAD);

  // ---------------------------------------------------------------- EFFEMERIDI
  // giorni dall'epoca 2000-01-00.0 TDT (convenzione Schlyter)
  function dayNum(date) { return date.getTime() / 86400000 + 2440587.5 - 2451543.5; }

  function sunPos(d) {
    const w = 282.9404 + 4.70935e-5 * d;          // argomento del perielio
    const e = 0.016709 - 1.151e-9 * d;
    const M = rev(356.0470 + 0.9856002585 * d);   // anomalia media
    const obl = 23.4393 - 3.563e-7 * d;
    const E = M + DEG * e * sin(M) * (1 + e * cos(M));
    const xv = cos(E) - e, yv = Math.sqrt(1 - e * e) * sin(E);
    const r = Math.sqrt(xv * xv + yv * yv);
    const v = Math.atan2(yv, xv) * DEG;
    const lon = rev(v + w);                       // longitudine eclittica
    const xs = r * cos(lon), ys = r * sin(lon);
    const xe = xs, ye = ys * cos(obl), ze = ys * sin(obl);
    return {
      RA: rev(Math.atan2(ye, xe) * DEG),
      Dec: Math.atan2(ze, Math.sqrt(xe * xe + ye * ye)) * DEG,
      lon: lon, Ls: rev(M + w), M: M, obl: obl
    };
  }

  function moonPos(d, s) {
    const N = rev(125.1228 - 0.0529538083 * d);   // nodo ascendente
    const i = 5.1454;
    const w = rev(318.0634 + 0.1643573223 * d);
    const a = 60.2666;                            // raggi terrestri
    const e = 0.054900;
    const M = rev(115.3654 + 13.0649929509 * d);
    // Keplero (l'eccentricita' lunare richiede qualche iterazione)
    let E = M + DEG * e * sin(M) * (1 + e * cos(M));
    for (let k = 0; k < 12; k++) {
      const dE = (E - DEG * e * sin(E) - M) / (1 - e * cos(E));
      E -= dE; if (Math.abs(dE) < 0.0005) break;
    }
    const xv = a * (cos(E) - e), yv = a * Math.sqrt(1 - e * e) * sin(E);
    const r0 = Math.sqrt(xv * xv + yv * yv);
    const v = rev(Math.atan2(yv, xv) * DEG);
    const xh = r0 * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i));
    const yh = r0 * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i));
    const zh = r0 * sin(v + w) * sin(i);
    let lon = rev(Math.atan2(yh, xh) * DEG);
    let lat = Math.atan2(zh, Math.sqrt(xh * xh + yh * yh)) * DEG;
    let r = Math.sqrt(xh * xh + yh * yh + zh * zh);

    // perturbazioni principali (Schlyter): senza queste l'errore arriva a ~1 grado
    const Ms = s.M, Ls = s.Ls;
    const Lm = rev(N + w + M), D = rev(Lm - Ls), F = rev(Lm - N);
    lon += -1.274 * sin(M - 2 * D) + 0.658 * sin(2 * D) - 0.186 * sin(Ms)
      - 0.059 * sin(2 * M - 2 * D) - 0.057 * sin(M - 2 * D + Ms) + 0.053 * sin(M + 2 * D)
      + 0.046 * sin(2 * D - Ms) + 0.041 * sin(M - Ms) - 0.035 * sin(D)
      - 0.031 * sin(M + Ms) - 0.015 * sin(2 * F - 2 * D) + 0.011 * sin(M - 4 * D);
    lat += -0.173 * sin(F - 2 * D) - 0.055 * sin(M - F - 2 * D) - 0.046 * sin(M + F - 2 * D)
      + 0.033 * sin(F + 2 * D) + 0.017 * sin(2 * M + F);
    r += -0.58 * cos(M - 2 * D) - 0.46 * cos(2 * D);
    lon = rev(lon);

    const obl = s.obl;
    const xg = r * cos(lon) * cos(lat), yg = r * sin(lon) * cos(lat), zg = r * sin(lat);
    const xe = xg, ye = yg * cos(obl) - zg * sin(obl), ze = yg * sin(obl) + zg * cos(obl);
    return {
      RA: rev(Math.atan2(ye, xe) * DEG),
      Dec: Math.atan2(ze, Math.sqrt(xe * xe + ye * ye)) * DEG,
      lon: lon, lat: lat, r: r,
      par: Math.asin(1 / r) * DEG            // parallasse orizzontale
    };
  }

  // angolo orario (0-360): 0 = astro al meridiano (culminazione alta), 180 = culminazione bassa
  function hourAngleOf(body, date, lon) {
    const d = dayNum(date), s = sunPos(d);
    const p = (body === 'sun') ? s : moonPos(d, s);
    const UT = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    return rev(rev(rev(s.Ls + 180) + UT * 15 + lon) - p.RA);
  }
  // Culminazione = passaggio al meridiano (angolo orario = 0 oppure 180), NON massimo di altezza:
  // per la Luna, che cambia declinazione in fretta, i due istanti differiscono di qualche minuto
  // e il riferimento (USNO, effemeridi nautiche) usa il meridiano.
  function transitsIn(body, from, to, lon, target) {
    const f = tms => { const x = hourAngleOf(body, new Date(tms), lon) - target; return rev(x + 180) - 180; };
    const STEP = 30 * 60000, out = [];
    let ta = from, ya = f(ta);
    for (let tb = from + STEP; tb <= to; tb += STEP) {
      const yb = f(tb);
      if (ya < 0 && yb >= 0) {
        let lo = ta, hi = tb;
        for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; }
        out.push(new Date(Math.round((lo + hi) / 2 / 1000) * 1000));
      }
      ta = tb; ya = yb;
    }
    return out;
  }

  // altezza sull'orizzonte (geocentrica) di Sole/Luna a un dato istante
  function altitude(body, date, lat, lon) {
    const d = dayNum(date), s = sunPos(d);
    const p = (body === 'sun') ? s : moonPos(d, s);
    const UT = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const LST = rev(rev(s.Ls + 180) + UT * 15 + lon);   // tempo siderale locale
    const HA = rev(LST - p.RA);
    const alt = Math.asin(sin(p.Dec) * sin(lat) + cos(p.Dec) * cos(lat) * cos(HA)) * DEG;
    return { alt: alt, h0: (body === 'sun') ? -0.833 : (0.7275 * p.par - 0.566) };
  }

  // Campiona la giornata locale (con un'ora di margine ai bordi) e ricava levata, tramonto,
  // culminazione alta e bassa. La Luna torna allo stesso punto ogni 24 h 50 min: ci sono giorni
  // SENZA levata, senza tramonto o senza culminazione -> in quel caso si restituisce null,
  // non un orario inventato preso dal bordo della finestra.
  function dayEvents(body, dayStart, lat, lon) {
    const STEP = 4 * 60000;
    const t0 = dayStart.getTime() - 3600000;                    // 1 h prima della mezzanotte
    const dayEnd = dayStart.getTime() + 86400000;
    const N = Math.round(26 * 60 / 4) + 1;                      // 26 ore campionate a 4 min
    const t = [], a = [], h = [];
    for (let k = 0; k < N; k++) {
      const dt = new Date(t0 + k * STEP);
      const r = altitude(body, dt, lat, lon);
      t.push(dt); a.push(r.alt); h.push(r.h0);
    }
    const inDay = tt => tt && tt.getTime() >= dayStart.getTime() && tt.getTime() < dayEnd;
    let rise = null, set = null;
    for (let k = 1; k < N; k++) {
      const y0 = a[k - 1] - h[k - 1], y1 = a[k] - h[k];
      if (y0 === 0 || (y0 < 0) === (y1 < 0)) continue;
      const f = y0 / (y0 - y1);                                  // interpolazione lineare sullo zero
      const tt = new Date(t[k - 1].getTime() + f * STEP);
      if (!inDay(tt)) continue;
      if (y1 > y0) { if (rise === null) rise = tt; } else if (set === null) set = tt;
    }
    // culminazioni: passaggi al meridiano dentro la giornata (possono mancare: la Luna ritarda
    // di ~50 min al giorno, quindi certi giorni non ha culminazione alta o bassa)
    const transit = transitsIn(body, t0, dayEnd + 3600000, lon, 0).find(inDay) || null;
    const lower = transitsIn(body, t0, dayEnd + 3600000, lon, 180).find(inDay) || null;
    const maxAlt = transit ? altitude(body, transit, lat, lon).alt : null;
    return { rise: rise, set: set, transit: transit, lower: lower, maxAlt: maxAlt };
  }

  // ------------------------------------------------------------------- LUNA
  function elongAt(date) {
    const d = dayNum(date), s = sunPos(d);
    return rev(moonPos(d, s).lon - s.lon);
  }
  // Istante esatto della prossima fase (0 = nuova, 180 = piena): l'elongazione cresce sempre
  // (~12,2 gradi/giorno ma con velocita' variabile), quindi si cerca l'attraversamento e si
  // affina per bisezione. Stimarlo dall'eta' media sbaglierebbe anche di mezza giornata.
  function nextPhaseTime(from, target) {
    const f = tms => { let x = elongAt(new Date(tms)) - target; return rev(x + 180) - 180; };
    const STEP = 6 * 3600000;
    let t0 = from.getTime(), y0 = f(t0);
    for (let k = 1; k <= 140; k++) {                  // copre ~35 giorni
      const t1 = t0 + STEP, y1 = f(t1);
      if (y0 < 0 && y1 >= 0) {
        let a = t0, b = t1;
        for (let i = 0; i < 40; i++) { const mid = (a + b) / 2; if (f(mid) < 0) a = mid; else b = mid; }
        return new Date((a + b) / 2);
      }
      t0 = t1; y0 = y1;
    }
    return null;
  }
  function moonPhase(date) {
    const d = dayNum(date), s = sunPos(d), m = moonPos(d, s);
    const elong = rev(m.lon - s.lon);                 // 0 = nuova, 180 = piena
    const illum = (1 - cos(elong)) / 2;
    const age = elong / 360 * SYN;
    // Nome della fase ricavato dall'ILLUMINAZIONE (non dall'eta' media): cosi' il nome non puo'
    // contraddire la percentuale mostrata accanto (es. "ultimo quarto" con il 58% illuminato).
    const waxing = elong < 180, pc = illum * 100;
    let name, idx;
    if (pc < 1.5) { name = 'moon.new'; idx = 0; }
    else if (pc > 98.5) { name = 'moon.full'; idx = 4; }
    else if (pc >= 46 && pc <= 54) { name = waxing ? 'moon.first' : 'moon.last'; idx = waxing ? 2 : 6; }
    else if (pc < 46) { name = waxing ? 'moon.wax_cres' : 'moon.wan_cres'; idx = waxing ? 1 : 7; }
    else { name = waxing ? 'moon.wax_gib' : 'moon.wan_gib'; idx = waxing ? 3 : 5; }
    return {
      elong: elong, illum: illum, age: age, waxing: elong < 180,
      name: name, idx: idx,
      nextNew: nextPhaseTime(date, 0),
      nextFull: nextPhaseTime(date, 180),
      dist: Math.round(m.r * 6371)                    // km (raggi terrestri -> km)
    };
  }

  // -------------------------------------------------------------- SOLUNARE
  // Maggiori: culminazione alta e bassa della Luna (+/- 1 h). Minori: levata e tramonto (+/- 30 min).
  function solunarDay(date, lat, lon) {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const sun = dayEvents('sun', dayStart, lat, lon);
    const moon = dayEvents('moon', dayStart, lat, lon);
    const ph = moonPhase(new Date(dayStart.getTime() + 12 * 3600000));
    const P = [];
    const add = (c, maj) => { if (c) P.push({ t: c, major: maj, from: new Date(c.getTime() - (maj ? 60 : 30) * 60000), to: new Date(c.getTime() + (maj ? 60 : 30) * 60000) }); };
    add(moon.transit, true); add(moon.lower, true);
    add(moon.rise, false); add(moon.set, false);
    P.sort((x, y) => x.t - y.t);

    // punteggio del giorno: fase (novilunio/plenilunio = massimo) + coincidenza con alba/tramonto
    const dPhase = Math.min(ph.age, Math.abs(ph.age - SYN / 2), SYN - ph.age);   // giorni dalla nuova o dalla piena
    let score = 1 - dPhase / (SYN / 4);                                          // 0..1
    let bonus = 0;
    const near = (a, b, h) => a && b && Math.abs(a - b) < h * 3600000;
    P.forEach(p => {
      if (near(p.t, sun.rise, 1.5) || near(p.t, sun.set, 1.5)) bonus += p.major ? 0.30 : 0.15;
    });
    const stars = Math.max(0.5, Math.min(4, Math.round((score * 3 + bonus * 2) * 2) / 2));
    return { date: dayStart, sun: sun, moon: moon, phase: ph, periods: P, stars: stars };
  }

  window.Solunar = { day: solunarDay, phase: moonPhase, events: dayEvents, altitude: altitude };

  // ================================================================= INTERFACCIA
  const css = document.createElement('style');
  css.textContent = `
  #slSheet{position:fixed;z-index:1310;left:0;right:0;bottom:0;max-width:680px;margin:0 auto;
    background:rgba(14,28,46,.98);border-top:1px solid #1f3650;border-radius:18px 18px 0 0;
    padding:12px 14px calc(env(safe-area-inset-bottom,0px) + 14px);box-shadow:0 -8px 32px #000b;
    max-height:86vh;overflow:auto;color:#dfeaf5;font-size:13px;display:none}
  #slSheet .slHd{display:flex;align-items:center;gap:8px;margin-bottom:10px}
  #slSheet .slHd b{color:#16e0ff;font-size:15px;flex:1}
  #slClose{background:none;border:none;color:#cfe0f2;font-size:20px;cursor:pointer;line-height:1}
  .slMoon{display:flex;gap:12px;align-items:center;background:#0c1c2e;border:1px solid #1f3650;border-radius:12px;padding:10px 12px}
  .slMoon canvas{width:64px;height:64px;flex:0 0 64px}
  .slMoon .mi b{color:#eafcff;font-size:15px;display:block}
  .slMoon .mi span{color:#8fb0cc;font-size:11.5px;line-height:1.55;display:block}
  .slNow{background:#123a52;border:1px solid #16e0ff;border-radius:12px;padding:9px 12px;margin-top:8px;font-size:13px}
  .slNow.off{background:#0c1c2e;border-color:#1f3650}
  .slNow b{color:#16e0ff}
  .slRow{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}
  .slC{background:#0c1c2e;border:1px solid #1f3650;border-radius:10px;padding:7px 8px;text-align:center}
  .slC .k{font-size:9.5px;color:#8fb0cc;text-transform:uppercase;letter-spacing:.3px}
  .slC .v{font-size:14.5px;font-weight:700;color:#eafcff}
  .slLbl{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#8fb0cc;margin:11px 2px 4px;font-weight:600}
  #slBar{display:block;width:100%;height:62px;background:#08182a;border:1px solid #1f3650;border-radius:10px}
  .slP{display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:9px;background:#0c1c2e;border:1px solid #1f3650;margin-top:5px}
  .slP.maj{border-color:#8dff3a55}
  .slP .tg{font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:#1a3350;color:#8fb0cc;white-space:nowrap}
  .slP.maj .tg{background:#213a18;color:#8dff3a}
  .slP .tm{font-weight:700;color:#eafcff;flex:1}
  .slP .nt{font-size:11px;color:#8fb0cc}
  .slP.live{box-shadow:0 0 0 2px #16e0ff55}
  .slDay{display:flex;align-items:center;gap:8px;padding:5px 8px;border-bottom:1px solid #14283e;font-size:12.5px}
  .slDay:last-child{border-bottom:none}
  .slDay .d{width:76px;color:#cfe0f2}
  .slDay .st{color:#ffd23a;letter-spacing:1px;flex:1}
  .slDay .mp{color:#8fb0cc;font-size:11px}
  .slFoot{font-size:9.5px;color:#6f8ba0;margin-top:10px;line-height:1.5}
  `;
  document.head.appendChild(css);

  const sheet = document.createElement('div');
  sheet.id = 'slSheet';
  sheet.innerHTML =
    '<div class="slHd"><b>&#127769; ' + T('sl.title', 'Solunare e Luna') + '</b><button id="slClose">&#10005;</button></div>' +
    '<div class="slMoon"><canvas id="slMoonCv" width="128" height="128"></canvas><div class="mi" id="slMoonTxt"></div></div>' +
    '<div class="slNow" id="slNow"></div>' +
    '<div class="slRow" id="slTimes"></div>' +
    '<div class="slLbl">' + T('sl.today', 'Periodi di oggi') + '</div>' +
    '<canvas id="slBar" width="900" height="124"></canvas>' +
    '<div id="slList"></div>' +
    '<div class="slLbl">' + T('sl.week', 'Prossimi 7 giorni') + '</div>' +
    '<div id="slWeek"></div>' +
    '<div class="slFoot">' + T('sl.note', 'Orari calcolati sul posto dal dispositivo (effemeridi Sole/Luna): funzionano anche senza rete. La teoria solunare è una regola empirica, non una legge dimostrata: usala insieme a mare, vento e marea.') + '</div>';
  document.body.appendChild(sheet);
  el('slClose').onclick = () => { sheet.style.display = 'none'; };

  const rail = el('rail');
  if (rail) {
    const b = document.createElement('button');
    b.className = 'railbtn'; b.id = 'btnSol';
    b.innerHTML = '&#127769;<small>' + T('rail.sol', 'Solunare') + '</small>';
    rail.appendChild(b);
  } else {
    const anchor = el('btnWx') || el('btnPrey');
    if (anchor && anchor.parentNode) {
      const b = document.createElement('button');
      b.id = 'btnSol';
      b.style.cssText = 'width:100%;margin-top:5px;padding:6px;border-radius:7px;border:1px solid #16e0ff;background:#11243c;color:#16e0ff;font-weight:700;font-size:12px;cursor:pointer';
      b.innerHTML = '&#127769; ' + T('sl.title', 'Solunare e Luna');
      anchor.parentNode.insertBefore(b, anchor.nextSibling);
    }
  }
  if (el('btnSol')) el('btnSol').onclick = openSol;

  const hhmm = d => d ? pad(d.getHours()) + ':' + pad(d.getMinutes()) : '–';
  const stars = n => '★'.repeat(Math.floor(n)) + (n % 1 >= 0.5 ? '☆' : '') ;

  function openSol() {
    const c = map.getCenter();
    const now = new Date();
    const D = solunarDay(now, c.lat, c.lng);
    sheet.style.display = 'block';

    // --- luna ---
    drawMoon(D.phase);
    const dd = d => d ? pad(d.getDate()) + '/' + pad(d.getMonth() + 1) : '–';
    el('slMoonTxt').innerHTML =
      '<b>' + T(D.phase.name, D.phase.name) + ' · ' + Math.round(D.phase.illum * 100) + '%</b>' +
      '<span>' + T('sl.age', 'età') + ' ' + D.phase.age.toFixed(1) + ' ' + T('sl.days', 'giorni') +
      ' · ' + (D.phase.waxing ? T('sl.waxing', 'crescente') : T('sl.waning', 'calante')) + '</span>' +
      '<span>&#9679; ' + T('sl.nextnew', 'nuova') + ' ' + dd(D.phase.nextNew) +
      ' &nbsp;&#9675; ' + T('sl.nextfull', 'piena') + ' ' + dd(D.phase.nextFull) + '</span>' +
      '<span>' + T('sl.rating', 'giornata') + ': <b style="color:#ffd23a">' + stars(D.stars) + '</b></span>';

    // --- orari ---
    el('slTimes').innerHTML =
      cell('&#9728;&#65039; ' + T('sl.sunrise', 'Alba'), hhmm(D.sun.rise)) +
      cell('&#127751; ' + T('sl.sunset', 'Tramonto'), hhmm(D.sun.set)) +
      cell('&#127769;&#8593; ' + T('sl.moonrise', 'Luna sorge'), hhmm(D.moon.rise)) +
      cell('&#127769;&#8595; ' + T('sl.moonset', 'Luna tramonta'), hhmm(D.moon.set));

    // --- adesso ---
    const live = D.periods.find(p => now >= p.from && now <= p.to);
    const next = D.periods.find(p => p.from > now);
    const nowBox = el('slNow');
    if (live) {
      nowBox.className = 'slNow';
      nowBox.innerHTML = '&#128293; <b>' + (live.major ? T('sl.major', 'Periodo maggiore') : T('sl.minor', 'Periodo minore')) +
        ' ' + T('sl.inprogress', 'in corso') + '</b> — ' + T('sl.until', 'fino alle') + ' ' + hhmm(live.to);
    } else if (next) {
      const mins = Math.round((next.from - now) / 60000);
      nowBox.className = 'slNow off';
      nowBox.innerHTML = T('sl.nextis', 'Prossimo') + ': <b>' + (next.major ? T('sl.major', 'Periodo maggiore') : T('sl.minor', 'Periodo minore')) +
        '</b> ' + T('sl.at', 'alle') + ' ' + hhmm(next.from) + ' (' + (mins >= 60 ? Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min' : mins + ' min') + ')';
    } else {
      // niente piu' periodi oggi: si guarda al primo di domani (serve la sera, per programmare l'alba)
      const dom = solunarDay(new Date(now.getTime() + 86400000), c.lat, c.lng);
      const first = dom.periods[0];
      nowBox.className = 'slNow off';
      nowBox.innerHTML = first
        ? T('sl.tomorrow', 'Domani') + ': <b>' + (first.major ? T('sl.major', 'Periodo maggiore') : T('sl.minor', 'Periodo minore')) +
          '</b> ' + T('sl.at', 'alle') + ' ' + hhmm(first.from)
        : T('sl.nomore', 'Nessun altro periodo oggi.');
    }

    drawBar(D, now);

    // --- elenco periodi ---
    el('slList').innerHTML = D.periods.map(p => {
      const isLive = now >= p.from && now <= p.to;
      const what = p.major
        ? (p.t === D.moon.transit ? T('sl.zenith', 'Luna allo zenit') : T('sl.nadir', 'Luna al nadir'))
        : (p.t === D.moon.rise ? T('sl.moonrise', 'Luna sorge') : T('sl.moonset', 'Luna tramonta'));
      return '<div class="slP ' + (p.major ? 'maj ' : '') + (isLive ? 'live' : '') + '">' +
        '<span class="tg">' + (p.major ? T('sl.maj_s', 'MAGG') : T('sl.min_s', 'min')) + '</span>' +
        '<span class="tm">' + hhmm(p.from) + ' – ' + hhmm(p.to) + '</span>' +
        '<span class="nt">' + what + '</span></div>';
    }).join('');

    // --- 7 giorni ---
    const wd = (window.I18N && window.I18N.lang === 'it')
      ? ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = '';
    for (let k = 0; k < 7; k++) {
      const dt = new Date(now.getTime() + k * 86400000);
      const d2 = solunarDay(dt, c.lat, c.lng);
      html += '<div class="slDay"><span class="d">' + (k === 0 ? T('sl.today_s', 'oggi') : wd[dt.getDay()] + ' ' + dd(dt)) + '</span>' +
        '<span class="st">' + stars(d2.stars) + '</span>' +
        '<span class="mp">' + Math.round(d2.phase.illum * 100) + '% · ' + T(d2.phase.name, '') + '</span></div>';
    }
    el('slWeek').innerHTML = html;
  }
  function cell(k, v) { return '<div class="slC"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }

  // disco lunare con il terminatore reale
  function drawMoon(ph) {
    const cv = el('slMoonCv'), g = cv.getContext('2d'), S = cv.width, R = S / 2 - 4, cx = S / 2, cy = S / 2;
    g.clearRect(0, 0, S, S);
    g.fillStyle = '#16233a'; g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.fill();   // parte in ombra
    const k = Math.max(0, Math.min(1, ph.illum));         // frazione illuminata
    if (k > 0.005) {
      g.save();
      // La forma si costruisce sempre con la luce a DESTRA (Luna crescente);
      // se e' calante si specchia orizzontalmente.
      if (!ph.waxing) { g.translate(cx, cy); g.scale(-1, 1); g.translate(-cx, -cy); }
      g.fillStyle = '#f2f0e4';
      g.beginPath();
      g.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, false);  // semidisco illuminato
      // terminatore: semiellisse di semiasse R*|1-2k|; per k<0.5 curva verso la luce (falce),
      // per k>0.5 curva verso l'ombra (gibbosa)
      g.ellipse(cx, cy, R * Math.abs(1 - 2 * k), R, 0, Math.PI / 2, -Math.PI / 2, k < 0.5);
      g.closePath(); g.fill();
      g.restore();
    }
    g.strokeStyle = '#2a4870'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.stroke();
  }

  // barra 24 h: notte/giorno, periodi maggiori e minori, adesso
  function drawBar(D, now) {
    const cv = el('slBar'), g = cv.getContext('2d');
    const W = cv.width, H = cv.height, padL = 8, padR = 8, padT = 6, padB = 18;
    const pw = W - padL - padR, ph = H - padT - padB;
    const t0 = D.date.getTime(), span = 86400000;
    const X = t => padL + pw * Math.max(0, Math.min(1, (t - t0) / span));
    g.clearRect(0, 0, W, H);
    // notte
    g.fillStyle = '#0a1a2c'; g.fillRect(padL, padT, pw, ph);
    if (D.sun.rise && D.sun.set) {
      g.fillStyle = '#14304a';
      g.fillRect(X(D.sun.rise.getTime()), padT, X(D.sun.set.getTime()) - X(D.sun.rise.getTime()), ph);
    }
    // periodi
    D.periods.forEach(p => {
      const x0 = X(p.from.getTime()), x1 = X(p.to.getTime());
      g.fillStyle = p.major ? 'rgba(141,255,58,.55)' : 'rgba(22,224,255,.42)';
      g.fillRect(x0, padT + (p.major ? 0 : ph * .28), Math.max(2, x1 - x0), p.major ? ph : ph * .72);
    });
    // ore
    g.strokeStyle = '#1b3b55'; g.fillStyle = '#6f8ba0'; g.font = '12px system-ui'; g.textAlign = 'center'; g.lineWidth = 1;
    for (let h = 0; h <= 24; h += 3) {
      const x = padL + pw * h / 24;
      g.beginPath(); g.moveTo(x, padT); g.lineTo(x, padT + ph); g.stroke();
      if (h < 24) g.fillText(pad(h), x, H - 5);
    }
    // adesso
    const xn = X(now.getTime());
    g.strokeStyle = '#ffd23a'; g.lineWidth = 2; g.beginPath(); g.moveTo(xn, padT - 3); g.lineTo(xn, padT + ph + 3); g.stroke();
  }

  window.FishCastSol = { open: openSol };
})();
