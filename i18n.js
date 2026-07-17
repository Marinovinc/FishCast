/* FishCast — motore i18n (multilingua) condiviso.
   - Rileva la lingua del dispositivo (navigator.languages), fallback INGLESE (pubblico mondiale).
   - Selettore manuale persistente (localStorage 'fc_lang').
   - Estensibile: aggiungere una lingua = aggiungere una voce a DICT (es. zh, ar, de, fr, es).
   - Supporto RTL (destra->sinistra) per arabo/ebraico/persiano/urdu: imposta document.dir='rtl'.
   Traduce all'avvio gli elementi con data-i18n (testo) e data-i18n-ph (placeholder). */
(function(){
  "use strict";

  // Lingue RTL (quando aggiungerai 'ar' basta il dizionario: il layout si specchia da solo)
  var RTL = ['ar','he','fa','ur'];

  // Nomi lingua per il selettore (mostrati anche se il dizionario non è ancora completo)
  var LANG_NAMES = { it:'Italiano', en:'English', de:'Deutsch', fr:'Français', es:'Español', zh:'中文', ar:'العربية' };

  // ===== DIZIONARI ===== (IT completo, EN completo; le altre lingue si aggiungono qui)
  var DICT = {
    it: {
      // --- rail / menu mobile ---
      'rail.layers':'Livelli', 'rail.gps':'GPS', 'rail.ruler':'Righello', 'rail.mark':'Segna', 'rail.prey':'Prede',
      'sheet.title':'Livelli', 'sheet.sat':'🛰️ Satellitare', 'sheet.map':'🗺️ Mappa',
      'grp.bathy':'Batimetria', 'grp.bottom':'Fondale & carte', 'grp.tools':'Strumenti',
      'lyr.sdb':'Profondità SDB', 'lyr.comp':'Composito', 'lyr.iso':'Linee batim.', 'lyr.isofine':'Fitte 0,5 m',
      'lyr.canal':'Canaloni', 'lyr.emodnet':'Isobate EMODnet', 'lyr.nautical':'Carta nautica',
      'lyr.substrate':'Substrato', 'lyr.posidonia':'Posidonia', 'lyr.marks':'I miei punti',
      'rng.data':'Data', 'rng.depth':'Prof.', 'rng.habitat':'Habitat',
      'act.home':'🏠 Partenza', 'act.calib':'🎯 Calibra', 'act.offline':'⬇ Offline',
      'foot.guide':'Guida', 'foot.pc':'Versione PC', 'ui.language':'Lingua',
      // --- access / paywall ---
      'ac.proto':'Prototipo · il pagamento reale avviene via App Store/Google Play nell’app; il codice sarà validato dal server',
      'ac.unlock_title':'Sblocca tutte le funzioni',
      'ac.unlock_sub':'Fondale satellitare, canaloni, righello di lancio, catture e uso offline.',
      'ac.offer':'★ OFFERTA DI LANCIO', 'ac.per6':'/ primi 6 mesi', 'ac.then':'poi si rinnova col piano scelto qui sotto',
      'ac.annual':'Annuale', 'ac.save2':'RISPARMI ~2 MESI', 'ac.monthly':'Mensile', 'ac.after6':'dopo i 6 mesi',
      'ac.year':'/anno', 'ac.month':'/mese',
      'ac.btn_unlock':'Sblocca — €3,99', 'ac.have_code':'Ho un codice di attivazione',
      'ac.fine_pay':'Pagamento gestito da App Store / Google Play · si rinnova, disdici quando vuoi',
      'ac.code_title':'Hai un codice?',
      'ac.code_sub':'Inserisci il codice ricevuto (regalo, promo o acquistato sul sito). Nessuna password.',
      'ac.email_ph':'Email (facoltativa, per ricevuta e recupero)',
      'ac.activate':'Attiva',
      'ac.offline_note':'🔒 Il codice viene verificato una volta, poi l’app funziona offline',
      'ac.f_immediate':'Attivazione immediata', 'ac.f_device':'Valida su questo dispositivo', 'ac.f_nopwd':'Nessun account, nessuna password',
      'ac.see_plans':'Non hai un codice? Vedi i piani', 'ac.demo':'Prova il prototipo con il codice demo: FISH-DEMO-2026',
      'ac.msg_empty':'Inserisci un codice.', 'ac.msg_ok':'Codice valido! Attivato.', 'ac.msg_bad':'Codice non valido. Formato: FISH-XXXX-XXXX',
      'ac.unlocked_title':'Tutto sbloccato', 'ac.unlocked_sub':'Licenza attiva. Le funzioni restano disponibili anche senza rete.',
      'ac.lic_active':'LICENZA ATTIVA', 'ac.until':'attiva fino al {d}',
      'ac.src_code':'attivata con codice', 'ac.src_annual':'abbonamento annuale', 'ac.src_monthly':'abbonamento mensile', 'ac.renew_store':' · rinnovo dallo store',
      'ac.u1':'Profondità SDB + isobate', 'ac.u2':'Canaloni · righello · profilo', 'ac.u3':'Prede · catture · offline',
      'ac.go_map':'Vai alla mappa', 'ac.manage':'Gestisci abbonamento', 'ac.remove':'Rimuovi licenza (test)',
      'ac.buy_confirm':'Prototipo web: qui, nell’app scaricata, si aprirebbe il pagamento di App Store / Google Play.\n\nVuoi simulare uno sblocco di prova (6 mesi)?'
    },
    en: {
      'rail.layers':'Layers', 'rail.gps':'GPS', 'rail.ruler':'Ruler', 'rail.mark':'Mark', 'rail.prey':'Species',
      'sheet.title':'Layers', 'sheet.sat':'🛰️ Satellite', 'sheet.map':'🗺️ Map',
      'grp.bathy':'Bathymetry', 'grp.bottom':'Seabed & charts', 'grp.tools':'Tools',
      'lyr.sdb':'SDB depth', 'lyr.comp':'Composite', 'lyr.iso':'Depth lines', 'lyr.isofine':'Dense 0.5 m',
      'lyr.canal':'Channels', 'lyr.emodnet':'EMODnet isobaths', 'lyr.nautical':'Nautical chart',
      'lyr.substrate':'Substrate', 'lyr.posidonia':'Seagrass', 'lyr.marks':'My marks',
      'rng.data':'Date', 'rng.depth':'Depth', 'rng.habitat':'Habitat',
      'act.home':'🏠 Start', 'act.calib':'🎯 Calibrate', 'act.offline':'⬇ Offline',
      'foot.guide':'Guide', 'foot.pc':'Desktop', 'ui.language':'Language',
      'ac.proto':'Prototype · real payment happens via App Store/Google Play in the app; the code will be validated by the server',
      'ac.unlock_title':'Unlock all features',
      'ac.unlock_sub':'Satellite seabed, channels, casting ruler, catch log and offline use.',
      'ac.offer':'★ LAUNCH OFFER', 'ac.per6':'/ first 6 months', 'ac.then':'then renews at the plan chosen below',
      'ac.annual':'Yearly', 'ac.save2':'SAVE ~2 MONTHS', 'ac.monthly':'Monthly', 'ac.after6':'after 6 months',
      'ac.year':'/year', 'ac.month':'/month',
      'ac.btn_unlock':'Unlock — €3.99', 'ac.have_code':'I have an activation code',
      'ac.fine_pay':'Payment handled by App Store / Google Play · renews, cancel anytime',
      'ac.code_title':'Have a code?',
      'ac.code_sub':'Enter the code you received (gift, promo or bought on the website). No password.',
      'ac.email_ph':'Email (optional, for receipt and recovery)',
      'ac.activate':'Activate',
      'ac.offline_note':'🔒 The code is verified once, then the app works offline',
      'ac.f_immediate':'Instant activation', 'ac.f_device':'Valid on this device', 'ac.f_nopwd':'No account, no password',
      'ac.see_plans':'No code? See the plans', 'ac.demo':'Try the prototype with the demo code: FISH-DEMO-2026',
      'ac.msg_empty':'Please enter a code.', 'ac.msg_ok':'Valid code! Activated.', 'ac.msg_bad':'Invalid code. Format: FISH-XXXX-XXXX',
      'ac.unlocked_title':'All unlocked', 'ac.unlocked_sub':'License active. Features stay available even without network.',
      'ac.lic_active':'LICENSE ACTIVE', 'ac.until':'active until {d}',
      'ac.src_code':'activated with a code', 'ac.src_annual':'yearly subscription', 'ac.src_monthly':'monthly subscription', 'ac.renew_store':' · renews via the store',
      'ac.u1':'SDB depth + isobaths', 'ac.u2':'Channels · ruler · profile', 'ac.u3':'Species · catches · offline',
      'ac.go_map':'Go to map', 'ac.manage':'Manage subscription', 'ac.remove':'Remove license (test)',
      'ac.buy_confirm':'Web prototype: in the downloaded app, the App Store / Google Play payment would open here.\n\nSimulate a test unlock (6 months)?'
    }
  };

  function pickLang(){
    try{
      var saved = localStorage.getItem('fc_lang'); if(saved && DICT[saved]) return saved;
      var langs = navigator.languages || [navigator.language || 'en'];
      for(var i=0;i<langs.length;i++){ var code=(langs[i]||'').slice(0,2).toLowerCase(); if(DICT[code]) return code; }
    }catch(e){}
    return 'en';   // fallback mondiale
  }

  var LANG = pickLang();

  function t(key, vars){
    var s = (DICT[LANG] && DICT[LANG][key]);
    if(s==null) s = (DICT.en && DICT.en[key]);
    if(s==null) s = key;
    if(vars){ for(var k in vars){ s = s.split('{'+k+'}').join(vars[k]); } }
    return s;
  }

  function apply(root){
    root = root || document;
    var els = root.querySelectorAll('[data-i18n]');
    for(var i=0;i<els.length;i++){ els[i].textContent = t(els[i].getAttribute('data-i18n')); }
    var ph = root.querySelectorAll('[data-i18n-ph]');
    for(var j=0;j<ph.length;j++){ ph[j].setAttribute('placeholder', t(ph[j].getAttribute('data-i18n-ph'))); }
  }

  // Selettore lingua: <select data-i18n-picker></select> viene popolato e gestito
  function initPickers(){
    var pickers = document.querySelectorAll('[data-i18n-picker]');
    for(var i=0;i<pickers.length;i++){
      var sel = pickers[i]; sel.innerHTML='';
      for(var c=0;c<window.I18N.available.length;c++){ var code=window.I18N.available[c];
        var o=document.createElement('option'); o.value=code; o.textContent=LANG_NAMES[code]||code; if(code===LANG)o.selected=true; sel.appendChild(o); }
      sel.addEventListener('change', function(e){ window.I18N.set(e.target.value); });
    }
  }

  window.I18N = {
    lang: LANG,
    t: t,
    apply: apply,
    available: Object.keys(DICT),
    names: LANG_NAMES,
    isRTL: RTL.indexOf(LANG) >= 0,
    set: function(code){ if(DICT[code]){ try{ localStorage.setItem('fc_lang', code); }catch(e){} location.reload(); } }
  };

  try{
    document.documentElement.lang = LANG;
    if(window.I18N.isRTL) document.documentElement.dir = 'rtl';
  }catch(e){}

  function boot(){ apply(document); initPickers(); }
  if(document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
