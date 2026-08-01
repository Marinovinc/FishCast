"use strict";
/* FishCast — Backup dei dati dell'utente (esportazione e importazione).
   Dipende da engine.js (usa `map` solo indirettamente tramite il ricaricamento della pagina).

   PERCHE' ESISTE: catture, punti, calibrazioni e localita' vivono solo nel localStorage del
   browser. Se l'utente pulisce i dati del browser, cambia telefono o (su iOS) non apre l'app
   per qualche settimana, li perde DEFINITIVAMENTE e nessuno puo' recuperarli: non c'e' un
   account ne' un server. Questo modulo permette di portarseli via in un file e rimetterli
   dentro, senza backend e senza costi.

   COSA VIENE SALVATO: catture/punti, punti di calibrazione, localita' salvate, punto di
   partenza, porti esclusi dai canaloni, lingua.
   COSA NON VIENE SALVATO: la LICENZA (e' legata al dispositivo: si riattiva col proprio
   codice, il backup non deve diventare un modo per duplicarla) e le cache tecniche
   (tessere offline, immagine SDB, previsioni meteo), che si ricreano da sole. */
(function () {

  const FORMAT = 1;                        // versione del formato del file
  const T = (k, d) => (window.I18N && window.I18N.t ? window.I18N.t(k) : d) || d;
  const el = id => document.getElementById(id);
  const pad = n => (n < 10 ? '0' : '') + n;

  // chiavi esportate: liste (unibili) e valori singoli
  const LISTS = ['pr_marks', 'pr_calib', 'pr_places', 'pr_noports'];
  const SINGLES = ['pr_home', 'pr_noport_r', 'fc_lang'];

  const readList = k => { try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };

  function collect() {
    const data = {};
    LISTS.forEach(k => { const v = readList(k); if (v.length) data[k] = v; });
    SINGLES.forEach(k => { const v = localStorage.getItem(k); if (v !== null) data[k] = v; });
    return data;
  }
  function counts(data) {
    return {
      marks: (data.pr_marks || []).length,
      calib: (data.pr_calib || []).length,
      places: (data.pr_places || []).length,
      ports: (data.pr_noports || []).length
    };
  }
  // chiave di confronto per non duplicare le voci quando si unisce
  const keyOf = (k, o) => {
    if (!o || typeof o !== 'object') return JSON.stringify(o);
    const c = (+o.lat).toFixed(5) + ',' + (+o.lng).toFixed(5);
    if (k === 'pr_marks') return c + '|' + (o.time || '');
    if (k === 'pr_places') return c + '|' + (o.n || '');
    return c;
  };

  // ---------------------------------------------------------------- ESPORTA
  function fileName() {
    const d = new Date();
    return 'fishcast-backup-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.json';
  }
  async function doExport() {
    const data = collect(), n = counts(data);
    if (!n.marks && !n.calib && !n.places && !n.ports) { msg(T('bk.empty', 'Non c\'è ancora niente da salvare.'), true); return; }
    let photos = null;
    if (window.FishCastPhotos) {
      const ids = (data.pr_marks || []).map(m => m.photo).filter(Boolean);
      if (ids.length) { msg(T('bk.packing', 'Preparo il file con le foto…')); photos = await window.FishCastPhotos.exportAll(ids).catch(() => null); }
    }
    const payload = { app: 'FishCast', format: FORMAT, exportedAt: new Date().toISOString(), counts: n, data: data };
    if (photos && Object.keys(photos).length) payload.photos = photos;
    const txt = JSON.stringify(payload, null, 1);
    const blob = new Blob([txt], { type: 'application/json' });
    const name = fileName();
    // Su iPhone il download diretto spesso non funziona: si usa il foglio di condivisione
    try {
      const f = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f], title: 'FishCast backup' });
        msg(T('bk.shared', 'Backup pronto: salvalo dove preferisci (File, email, WhatsApp…).'));
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; /* altrimenti si ripiega sul download */ }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    msg(T('bk.saved', 'File salvato: ') + name);
  }

  // ---------------------------------------------------------------- IMPORTA
  let pending = null;                       // dati letti dal file, in attesa di conferma
  function readFile(file) {
    const r = new FileReader();
    r.onload = () => {
      let p;
      try { p = JSON.parse(r.result); } catch (e) { msg(T('bk.badfile', 'File non leggibile: non è un backup di FishCast.'), true); return; }
      if (!p || p.app !== 'FishCast' || !p.data) { msg(T('bk.badfile', 'File non leggibile: non è un backup di FishCast.'), true); return; }
      if (p.format > FORMAT) { msg(T('bk.newer', 'Questo backup viene da una versione più recente dell\'app: aggiornala prima di importarlo.'), true); return; }
      pending = p;
      const n = counts(p.data), when = (p.exportedAt || '').slice(0, 16).replace('T', ' ');
      el('bkConfirm').style.display = 'block';
      el('bkSummary').innerHTML = T('bk.found', 'Nel file:') + ' <b>' + n.marks + '</b> ' + T('bk.marks', 'catture/punti') +
        ' · <b>' + n.calib + '</b> ' + T('bk.calib', 'calibrazioni') +
        ' · <b>' + n.places + '</b> ' + T('bk.places', 'località') +
        ' · <b>' + n.ports + '</b> ' + T('bk.ports', 'porti esclusi') +
        (p.photos ? ' · <b>' + Object.keys(p.photos).length + '</b> ' + T('bk.photos', 'foto') : '') +
        (when ? '<br><span style="color:#8fb0cc">' + T('bk.made', 'creato il') + ' ' + when + '</span>' : '');
    };
    r.onerror = () => msg(T('bk.badfile', 'File non leggibile: non è un backup di FishCast.'), true);
    r.readAsText(file);
  }

  function apply(mode) {                    // mode: 'merge' | 'replace'
    if (!pending) return;
    const inc = pending.data, added = { marks: 0, calib: 0, places: 0, ports: 0 };
    const nameOf = { pr_marks: 'marks', pr_calib: 'calib', pr_places: 'places', pr_noports: 'ports' };
    LISTS.forEach(k => {
      const incoming = Array.isArray(inc[k]) ? inc[k] : [];
      if (mode === 'replace') {
        localStorage.setItem(k, JSON.stringify(incoming));
        added[nameOf[k]] = incoming.length;
        return;
      }
      const cur = readList(k), seen = new Set(cur.map(o => keyOf(k, o)));
      incoming.forEach(o => { const kk = keyOf(k, o); if (!seen.has(kk)) { cur.push(o); seen.add(kk); added[nameOf[k]]++; } });
      localStorage.setItem(k, JSON.stringify(cur));
    });
    SINGLES.forEach(k => {
      // in unione i valori singoli dell'utente attuale hanno la precedenza; in sostituzione vince il file
      if (inc[k] === undefined) { if (mode === 'replace') localStorage.removeItem(k); return; }
      if (mode === 'replace' || localStorage.getItem(k) === null) localStorage.setItem(k, inc[k]);
    });
    if (pending.photos && window.FishCastPhotos) window.FishCastPhotos.importAll(pending.photos).catch(() => { });
    pending = null;
    el('bkConfirm').style.display = 'none';
    const txt = (mode === 'replace' ? T('bk.replaced', 'Dati sostituiti:') : T('bk.merged', 'Dati aggiunti:')) +
      ' ' + added.marks + ' ' + T('bk.marks', 'catture/punti') + ', ' + added.calib + ' ' + T('bk.calib', 'calibrazioni') +
      ', ' + added.places + ' ' + T('bk.places', 'località') + '. ' + T('bk.reloading', 'Ricarico l\'app…');
    msg(txt);
    setTimeout(() => location.reload(), 1600);
  }

  // ---------------------------------------------------------------- UI
  const css = document.createElement('style');
  css.textContent = `
  #bkSheet{position:fixed;z-index:1320;left:0;right:0;bottom:0;max-width:680px;margin:0 auto;
    background:rgba(14,28,46,.98);border-top:1px solid #1f3650;border-radius:18px 18px 0 0;
    padding:12px 14px calc(env(safe-area-inset-bottom,0px) + 14px);box-shadow:0 -8px 32px #000b;
    max-height:86vh;overflow:auto;color:#dfeaf5;font-size:13px;display:none}
  #bkSheet .bkHd{display:flex;align-items:center;gap:8px;margin-bottom:10px}
  #bkSheet .bkHd b{color:#16e0ff;font-size:15px;flex:1}
  #bkClose{background:none;border:none;color:#cfe0f2;font-size:20px;cursor:pointer;line-height:1}
  #bkNow{background:#0c1c2e;border:1px solid #1f3650;border-radius:11px;padding:10px 12px;line-height:1.7}
  #bkNow b{color:#eafcff}
  .bkBtn{width:100%;margin-top:8px;padding:12px;border-radius:10px;border:1px solid #2c416c;
    background:#11243c;color:#dfeaf5;font-weight:700;font-size:14px;cursor:pointer}
  .bkBtn.go{background:#8dff3a;color:#0a2a06;border-color:#8dff3a}
  .bkBtn.warn{border-color:#ff8a5c;color:#ffb492}
  #bkConfirm{display:none;margin-top:10px;background:#12283f;border:1px solid #16e0ff55;border-radius:11px;padding:10px 12px}
  #bkSummary{line-height:1.6;margin-bottom:8px}
  #bkMsg{display:none;margin-top:9px;border-radius:10px;padding:9px 11px;font-size:12.5px;line-height:1.5;
    background:#123a52;border:1px solid #16e0ff}
  #bkMsg.err{background:#3a2a10;border-color:#7a5a18;color:#ffd68a}
  .bkNote{font-size:11px;color:#8fb0cc;margin-top:10px;line-height:1.55}
  `;
  document.head.appendChild(css);

  const sheet = document.createElement('div');
  sheet.id = 'bkSheet';
  sheet.innerHTML =
    '<div class="bkHd"><b>&#128190; ' + T('bk.title', 'Backup dei dati') + '</b><button id="bkClose">&#10005;</button></div>' +
    '<div id="bkNow"></div>' +
    '<button class="bkBtn go" id="bkExport">&#11015; ' + T('bk.export', 'Salva i miei dati in un file') + '</button>' +
    '<button class="bkBtn" id="bkPick">&#11014; ' + T('bk.import', 'Ripristina da un file') + '</button>' +
    '<input type="file" id="bkFile" accept="application/json,.json" style="display:none">' +
    '<div id="bkConfirm"><div id="bkSummary"></div>' +
    '<button class="bkBtn go" id="bkMerge">' + T('bk.merge', 'Aggiungi ai miei dati') + '</button>' +
    '<button class="bkBtn warn" id="bkReplace">' + T('bk.replace', 'Sostituisci tutto') + '</button>' +
    '<button class="bkBtn" id="bkCancel">' + T('bk.cancel', 'Annulla') + '</button></div>' +
    '<div id="bkMsg"></div>' +
    '<div class="bkNote">' + T('bk.note', 'I tuoi dati stanno solo dentro questo telefono: se pulisci il browser o cambi dispositivo si perdono. Fai il backup ogni tanto e tienilo in un posto tuo (File, email, cloud). La licenza non è inclusa nel file: si riattiva col tuo codice.') + '</div>';
  document.body.appendChild(sheet);

  function msg(t, isErr) {
    const m = el('bkMsg'); m.textContent = t; m.className = isErr ? 'err' : ''; m.style.display = 'block';
    clearTimeout(window._bkT); window._bkT = setTimeout(() => { m.style.display = 'none'; }, 7000);
  }
  function refresh() {
    const n = counts(collect());
    el('bkNow').innerHTML = T('bk.onphone', 'Adesso su questo telefono:') +
      '<br>&#127907; <b>' + n.marks + '</b> ' + T('bk.marks', 'catture/punti') +
      ' &nbsp;&#127919; <b>' + n.calib + '</b> ' + T('bk.calib', 'calibrazioni') +
      '<br>&#11088; <b>' + n.places + '</b> ' + T('bk.places', 'località') +
      ' &nbsp;&#9875; <b>' + n.ports + '</b> ' + T('bk.ports', 'porti esclusi') +
      '<span id="bkPh"></span>';
    if (window.FishCastPhotos) window.FishCastPhotos.usage().then(u => {
      const e = el('bkPh');
      if (e && u.count) e.innerHTML = '<br>&#128247; <b>' + u.count + '</b> ' + T('bk.photos', 'foto') +
        ' (' + (u.bytes / 1048576).toFixed(1).replace('.', ',') + ' MB)';
    }).catch(() => { });
  }
  function open() { refresh(); el('bkConfirm').style.display = 'none'; el('bkMsg').style.display = 'none'; sheet.style.display = 'block'; if (window.closeSheet) window.closeSheet(); }

  el('bkClose').onclick = () => { sheet.style.display = 'none'; };
  el('bkExport').onclick = doExport;
  el('bkPick').onclick = () => el('bkFile').click();
  el('bkFile').onchange = e => { const f = e.target.files && e.target.files[0]; if (f) readFile(f); e.target.value = ''; };
  el('bkMerge').onclick = () => apply('merge');
  el('bkReplace').onclick = () => apply('replace');
  el('bkCancel').onclick = () => { pending = null; el('bkConfirm').style.display = 'none'; };

  // pulsante accanto a "Offline", negli Strumenti (vale sia per il foglio mobile sia per il pannello PC)
  const host = el('btnOffline') && el('btnOffline').parentNode;
  if (host) {
    const b = document.createElement('button');
    b.id = 'btnBackup';
    b.className = el('btnOffline').className || '';
    if (!b.className) b.style.cssText = 'width:100%;margin-top:5px;padding:6px;border-radius:7px;border:1px solid #16e0ff;background:#11243c;color:#16e0ff;font-weight:700;font-size:12px;cursor:pointer';
    b.innerHTML = T('bk.btn', '&#128190; Backup');   // l'icona sta nella traduzione, come gli altri pulsanti Strumenti
    host.insertBefore(b, el('btnOffline').nextSibling);
    b.onclick = open;
  }

  window.FishCastBackup = { open: open, collect: collect, counts: counts };
})();
