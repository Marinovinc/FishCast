"use strict";
/* FishCast — Foto nelle catture.
   Dipende da engine.js (form catture, `map`, `marks`, `renderMarks`, `prDelMark`).

   DOVE STANNO LE FOTO: in IndexedDB, NON in localStorage. Il localStorage ha ~5 MB in tutto
   e ci vivono gia' catture, calibrazioni, localita' e cache: bastavano una decina di foto per
   saturarlo e far fallire in silenzio il salvataggio di TUTTO il resto. In IndexedDB lo spazio
   e' molto piu' ampio e la cattura conserva solo l'identificativo della foto.

   Ogni scatto viene ridimensionato a 1280 px di lato lungo e ricompresso in JPEG (qualita' 0,72):
   da ~4 MB della fotocamera si scende a ~150-250 KB, senza perdere la leggibilita' del pesce.
   Le foto restano sul dispositivo: non vengono caricate da nessuna parte. */
(function () {

  const T = (k, d) => (window.I18N && window.I18N.t ? window.I18N.t(k) : d) || d;
  const el = id => document.getElementById(id);
  const MAX_SIDE = 1280, QUALITY = 0.72;

  // ---------------------------------------------------------------- IndexedDB
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('fishcast', 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('photos')) r.result.createObjectStore('photos', { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(d => new Promise((res, rej) => {
      const t = d.transaction('photos', mode), st = t.objectStore('photos');
      const req = fn(st);
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    }));
  }
  const putPhoto = rec => tx('readwrite', st => st.put(rec));
  const getPhoto = id => tx('readonly', st => st.get(id));
  const delPhoto = id => tx('readwrite', st => st.delete(id));
  const allPhotos = () => tx('readonly', st => st.getAll());

  // ---------------------------------------------------------------- compressione
  async function shrink(file) {
    let bmp = null;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) {
      bmp = await new Promise((res, rej) => {                    // ripiego: <img> (orientamento EXIF gestito dal browser)
        const u = URL.createObjectURL(file), im = new Image();
        im.onload = () => { URL.revokeObjectURL(u); res(im); };
        im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); };
        im.src = u;
      });
    }
    const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight;
    const sc = Math.min(1, MAX_SIDE / Math.max(w0, h0));
    const w = Math.round(w0 * sc), h = Math.round(h0 * sc);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const data = cv.toDataURL('image/jpeg', QUALITY);
    return { data: data, w: w, h: h, bytes: Math.round(data.length * 0.75) };
  }
  const newId = () => 'ph_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------------------------------------------------------------- UI nel form cattura
  const css = document.createElement('style');
  css.textContent = `
  #mfPhotoRow{display:flex;gap:9px;align-items:center;margin-bottom:9px}
  #mfPhotoBtn{flex:1;padding:11px;border-radius:9px;border:1px dashed #2c8fb0;background:#0e1b30;color:#16e0ff;
    font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit}
  #mfPhotoThumb{width:56px;height:56px;flex:0 0 56px;border-radius:9px;object-fit:cover;border:1px solid #2c416c;display:none}
  #mfPhotoDel{display:none;background:none;border:none;color:#ff9bb0;font-size:20px;cursor:pointer;padding:0 3px}
  .prPhoto img{width:100%;max-width:230px;border-radius:8px;margin:5px 0;display:block;cursor:pointer}
  .prPhoto .ph-wait{color:#8fb0cc;font-size:11px}
  #phView{position:fixed;inset:0;z-index:2000;background:#000e;display:none;align-items:center;justify-content:center;padding:12px}
  #phView img{max-width:100%;max-height:88vh;border-radius:10px}
  #phView .x{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);right:14px;background:#0e2034;border:1px solid #1f3650;
    color:#dfeaf5;font-size:22px;width:42px;height:42px;border-radius:50%;cursor:pointer}
  `;
  document.head.appendChild(css);

  const viewer = document.createElement('div');
  viewer.id = 'phView';
  viewer.innerHTML = '<button class="x" id="phViewX">&#10005;</button><img id="phViewImg" alt="">';
  document.body.appendChild(viewer);
  const closeViewer = () => { viewer.style.display = 'none'; el('phViewImg').src = ''; };
  el('phViewX').onclick = closeViewer;
  viewer.onclick = e => { if (e.target === viewer) closeViewer(); };

  const form = el('markForm');
  let pending = null;                       // foto scattata ma non ancora salvata con la cattura
  if (form) {
    const row = document.createElement('div');
    row.id = 'mfPhotoRow';
    row.innerHTML = '<button type="button" id="mfPhotoBtn">&#128247; ' + T('ph.add', 'Aggiungi foto') + '</button>' +
      '<img id="mfPhotoThumb" alt=""><button type="button" id="mfPhotoDel" title="' + T('ph.remove', 'Togli la foto') + '">&#10005;</button>' +
      '<input type="file" id="mfPhotoFile" accept="image/*" style="display:none">';
    const btns = form.querySelector('.mfBtns');
    form.insertBefore(row, btns);

    el('mfPhotoBtn').onclick = () => el('mfPhotoFile').click();
    el('mfPhotoFile').onchange = async e => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f) return;
      el('mfPhotoBtn').textContent = T('ph.working', 'Preparo la foto…');
      try {
        const s = await shrink(f);
        pending = { id: newId(), data: s.data, ts: Date.now(), w: s.w, h: s.h, bytes: s.bytes };
        el('mfPhotoThumb').src = s.data; el('mfPhotoThumb').style.display = 'block';
        el('mfPhotoDel').style.display = 'block';
        el('mfPhotoBtn').textContent = '📷 ' + Math.round(s.bytes / 1024) + ' KB';
      } catch (err) {
        pending = null;
        el('mfPhotoBtn').textContent = T('ph.failed', 'Foto non caricata, riprova');
      }
    };
    el('mfPhotoDel').onclick = () => {
      pending = null;
      el('mfPhotoThumb').style.display = 'none'; el('mfPhotoDel').style.display = 'none';
      el('mfPhotoBtn').textContent = '📷 ' + T('ph.add', 'Aggiungi foto');
    };

    // Il salvataggio della cattura resta di engine.js: qui si aggancia solo la foto alla voce appena creata.
    const save = el('mfSave'), origSave = save.onclick;
    save.onclick = function (ev) {
      const ph = pending;
      origSave.call(save, ev);                                   // engine.js salva la cattura
      if (ph) {
        try {
          const list = JSON.parse(localStorage.getItem('pr_marks') || '[]');
          if (list.length) {
            list[list.length - 1].photo = ph.id;
            localStorage.setItem('pr_marks', JSON.stringify(list));
            putPhoto({ id: ph.id, data: ph.data, ts: ph.ts, w: ph.w, h: ph.h, bytes: ph.bytes })
              .then(() => { if (typeof marks !== 'undefined') { marks.length = 0; list.forEach(m => marks.push(m)); } if (typeof renderMarks === 'function') renderMarks(); })
              .catch(() => { });
          }
        } catch (e) { /* la cattura resta salvata comunque, senza foto */ }
      }
      el('mfPhotoDel').onclick();                                // pulisce il form per la prossima
    };
    // apertura form: azzera la foto in sospeso
    const btnMarkClear = () => { if (el('mfPhotoDel')) el('mfPhotoDel').onclick(); };
    ['mfCancel', 'mfClose'].forEach(id => { const b = el(id); if (b) { const o = b.onclick; b.onclick = e => { btnMarkClear(); if (o) o.call(b, e); }; } });
  }

  // ---------------------------------------------------------------- foto dentro il popup
  if (typeof map !== 'undefined' && map && map.on) {
    map.on('popupopen', e => {
      const box = e.popup.getElement() && e.popup.getElement().querySelector('.prPhoto[data-ph]');
      if (!box || box.dataset.done) return;
      const id = box.dataset.ph;
      box.innerHTML = '<span class="ph-wait">' + T('ph.loading', 'carico la foto…') + '</span>';
      getPhoto(id).then(rec => {
        if (!rec) { box.innerHTML = '<span class="ph-wait">' + T('ph.missing', 'foto non piu\' disponibile') + '</span>'; return; }
        box.dataset.done = '1';
        box.innerHTML = '';
        const im = document.createElement('img');
        im.src = rec.data; im.alt = '';
        im.onclick = () => { el('phViewImg').src = rec.data; viewer.style.display = 'flex'; };
        // NIENTE popup.update() qui: rigenera il contenuto dalla stringa di partenza e cancella
        // l'immagine appena inserita. A immagine caricata basta riposizionare la vista.
        // il popup puo' essere gia' stato chiuso (col righello attivo engine.js lo chiude): niente pan
        im.onload = () => { if (e.popup._map && e.popup._adjustPan) e.popup._adjustPan(); };
        box.appendChild(im);
      }).catch(() => { box.innerHTML = ''; });
    });
  }

  // eliminando la cattura si elimina anche la sua foto: niente file orfani che occupano spazio
  const origDel = window.prDelMark;
  if (typeof origDel === 'function') {
    window.prDelMark = function (idx) {
      try {
        const list = JSON.parse(localStorage.getItem('pr_marks') || '[]');
        const ph = list[idx] && list[idx].photo;
        if (ph) delPhoto(ph).catch(() => { });
      } catch (e) { }
      origDel(idx);
    };
  }

  // ---------------------------------------------------------------- API per il backup
  async function exportAll(ids) {
    const all = await allPhotos().catch(() => []);
    const keep = ids ? all.filter(p => ids.indexOf(p.id) >= 0) : all;
    const out = {};
    keep.forEach(p => { out[p.id] = p.data; });
    return out;
  }
  async function importAll(obj) {
    if (!obj) return 0;
    let n = 0;
    for (const id in obj) {
      try { await putPhoto({ id: id, data: obj[id], ts: Date.now(), bytes: Math.round(obj[id].length * 0.75) }); n++; } catch (e) { }
    }
    return n;
  }
  async function usage() {
    const all = await allPhotos().catch(() => []);
    return { count: all.length, bytes: all.reduce((s, p) => s + (p.bytes || Math.round((p.data || '').length * 0.75)), 0) };
  }
  // pulizia delle foto senza cattura (puo' capitare importando un backup parziale)
  async function prune() {
    const all = await allPhotos().catch(() => []);
    let used = [];
    try { used = JSON.parse(localStorage.getItem('pr_marks') || '[]').map(m => m.photo).filter(Boolean); } catch (e) { }
    let n = 0;
    for (const p of all) { if (used.indexOf(p.id) < 0) { await delPhoto(p.id).catch(() => { }); n++; } }
    return n;
  }

  // ---------------------------------------------------------------- GALLERIA DELLE CATTURE
  /* Serve davvero, non e' un vezzo: su cellulare il righello e' attivo di default e per scelta
     (engine.js, rulerSnappable) sopprime i popup dei segnaposti, perche' il tocco serve ad
     agganciare il punto B. Senza questa lista la foto di una cattura non si vedrebbe mai dal
     telefono. Qui c'e' anche il diario: specie, peso, data, profondita' e fondale. */
  const gal = document.createElement('div');
  gal.id = 'galSheet';
  gal.innerHTML = '<div class="galHd"><b>&#127907; ' + T('gal.title', 'Le mie catture') + '</b>' +
    '<span id="galCount"></span><button id="galClose">&#10005;</button></div><div id="galList"></div>';
  document.body.appendChild(gal);
  el('galClose').onclick = () => { gal.style.display = 'none'; };

  const gcss = document.createElement('style');
  gcss.textContent = `
  #galSheet{position:fixed;z-index:1320;left:0;right:0;bottom:0;max-width:680px;margin:0 auto;
    background:rgba(14,28,46,.98);border-top:1px solid #1f3650;border-radius:18px 18px 0 0;
    padding:12px 14px calc(env(safe-area-inset-bottom,0px) + 14px);box-shadow:0 -8px 32px #000b;
    max-height:86vh;overflow:auto;color:#dfeaf5;font-size:13px;display:none}
  .galHd{display:flex;align-items:center;gap:8px;margin-bottom:9px}
  .galHd b{color:#16e0ff;font-size:15px;flex:1}
  .galHd #galCount{font-size:11px;color:#8fb0cc}
  #galClose{background:none;border:none;color:#cfe0f2;font-size:20px;cursor:pointer;line-height:1}
  .galIt{display:flex;gap:10px;align-items:center;background:#0c1c2e;border:1px solid #1f3650;
    border-radius:11px;padding:8px 10px;margin-bottom:6px;cursor:pointer}
  .galIt img,.galIt .noph{width:54px;height:54px;flex:0 0 54px;border-radius:9px;object-fit:cover;border:1px solid #23415f}
  .galIt .noph{display:flex;align-items:center;justify-content:center;font-size:20px;background:#0e2034;color:#3f5a75}
  .galIt .tx{min-width:0;flex:1}
  .galIt .tx b{display:block;color:#eafcff;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .galIt .tx span{display:block;font-size:11px;color:#8fb0cc;line-height:1.5}
  .galEmpty{color:#8fb0cc;text-align:center;padding:18px 8px;line-height:1.6}
  `;
  document.head.appendChild(gcss);

  async function openGallery() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem('pr_marks') || '[]'); } catch (e) { }
    gal.style.display = 'block';
    el('galCount').textContent = list.length ? list.length + ' ' + T('bk.marks', 'catture/punti') : '';
    if (!list.length) {
      el('galList').innerHTML = '<div class="galEmpty">' + T('gal.empty', 'Nessuna cattura ancora. Usa &#127907; Segna sulla mappa: la foto si aggiunge dal modulo.') + '</div>';
      return;
    }
    const rows = list.map((m, i) => ({ m: m, i: i })).sort((a, b) => String(b.m.time || '').localeCompare(String(a.m.time || '')));
    el('galList').innerHTML = rows.map(r => {
      const m = r.m;
      const when = m.time ? new Date(m.time).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
      const dep = (m.depth == null) ? '' : (m.depth >= 0 ? '+' + Math.round(m.depth) + ' m' : Math.abs(Math.round(m.depth)) + ' m');
      return '<div class="galIt" data-i="' + r.i + '">' +
        (m.photo ? '<img data-ph="' + m.photo + '" alt="">' : '<span class="noph">&#128205;</span>') +
        '<div class="tx"><b>' + (m.specie ? escHtml(m.specie) : T('gal.point', 'Punto')) + (m.peso ? ' · ' + escHtml(m.peso) : '') + '</b>' +
        '<span>' + when + '</span>' +
        '<span>' + (dep ? T('gal.depth', 'prof.') + ' ' + dep : '') + (m.fondale ? ' · ' + escHtml(m.fondale) : '') + '</span></div></div>';
    }).join('');
    // miniature dalle foto salvate
    gal.querySelectorAll('img[data-ph]').forEach(im => {
      getPhoto(im.dataset.ph).then(rec => { if (rec) im.src = rec.data; }).catch(() => { });
    });
    gal.querySelectorAll('.galIt').forEach(row => {
      row.onclick = () => {
        const m = list[+row.dataset.i];
        if (!m) return;
        if (m.photo) getPhoto(m.photo).then(rec => {
          if (rec) { el('phViewImg').src = rec.data; viewer.style.display = 'flex'; }
        }).catch(() => { });
        if (typeof map !== 'undefined' && map.setView) map.setView([m.lat, m.lng], Math.max(map.getZoom(), 16));
      };
    });
  }
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // pulsante negli Strumenti, accanto a Backup
  const anchor = el('btnBackup') || el('btnOffline');
  if (anchor && anchor.parentNode) {
    const b = document.createElement('button');
    b.id = 'btnGallery';
    b.className = anchor.className || '';
    if (!b.className) b.style.cssText = 'width:100%;margin-top:5px;padding:6px;border-radius:7px;border:1px solid #16e0ff;background:#11243c;color:#16e0ff;font-weight:700;font-size:12px;cursor:pointer';
    b.innerHTML = T('gal.btn', '&#128247; Catture');
    anchor.parentNode.insertBefore(b, anchor.nextSibling);
    b.onclick = () => { openGallery(); if (window.closeSheet) window.closeSheet(); };
  }

  window.FishCastPhotos = { exportAll: exportAll, importAll: importAll, usage: usage, prune: prune, get: getPhoto, gallery: openGallery };
})();
