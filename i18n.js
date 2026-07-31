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
      // --- punteggio di morso (bite.js) + calendario ---
      'bi.now':'Morso adesso', 'bi.score':'punteggio', 'bi.why':'Perché questo voto?',
      'bi.windows':'Finestre migliori (48 h)', 'bi.nowindow':'Nessuna finestra sopra 60/100 nelle prossime 48 h',
      'bi.withwx':'solunare + mare e meteo', 'bi.solonly':'solo solunare: manca il meteo',
      'bi.excellent':'ottimo', 'bi.good':'buono', 'bi.fair':'discreto', 'bi.poor':'modesto', 'bi.bad':'scarso',
      'bi.nearperiod':'Poco fuori da un periodo solunare', 'bi.noperiod':'Fuori dai periodi solunari',
      'bi.dawn':'Prima luce: l’ora migliore', 'bi.dusk':'Tramonto: l’ora migliore',
      'bi.night':'Notte: buona da riva', 'bi.day':'Pieno giorno: la fascia peggiore',
      'bi.nowave':'Onda non disponibile qui', 'bi.flat':'Mare piatto', 'bi.calmish':'Poco mosso',
      'bi.ideal':'Mare giusto da riva', 'bi.lively':'Mosso, ancora pescabile', 'bi.rough':'Molto mosso',
      'bi.storm':'Mareggiata: impescabile e pericoloso',
      'bi.nowind':'Vento non disponibile', 'bi.windcalm':'Quasi calmo', 'bi.windgood':'Brezza favorevole',
      'bi.windfresh':'Teso: lancio più difficile', 'bi.windstrong':'Forte: si pesca male', 'bi.windgale':'Troppo vento',
      'bi.nopress':'Pressione non disponibile', 'bi.pdrop':'Pressione in calo netto', 'bi.pfall':'Pressione in calo',
      'bi.psteady':'Pressione stabile', 'bi.prise':'Pressione in aumento', 'bi.pjump':'Pressione in forte aumento',
      'bi.notide':'Marea non disponibile', 'bi.tidefast':'Marea in movimento deciso', 'bi.tidemove':'Marea in movimento',
      'bi.tideslow':'Marea lenta', 'bi.tideslack':'Acqua ferma (stanca)',
      'bi.note':'Stima da regole pratiche di pesca da riva e teoria solunare (solunare 30, luce 20, onda 20, vento 15, pressione 10, marea 5). Non è una previsione di catture.',
      'bi.cap_storm':'Mare troppo grosso: non si pesca da riva', 'bi.cap_rough':'Mareggiata: riva pericolosa',
      'bi.cap_wind':'Vento troppo forte per lanciare',
      'cal.wxday':'con meteo', 'sl.tapback':'tocca “oggi” nel calendario per tornare',
      // --- backup dati (backup.js) ---
      'bk.title':'Backup dei dati', 'bk.btn':'💾 Backup',
      'bk.onphone':'Adesso su questo telefono:',
      'bk.marks':'catture/punti', 'bk.calib':'calibrazioni', 'bk.places':'località', 'bk.ports':'porti esclusi',
      'bk.export':'Salva i miei dati in un file', 'bk.import':'Ripristina da un file',
      'bk.merge':'Aggiungi ai miei dati', 'bk.replace':'Sostituisci tutto', 'bk.cancel':'Annulla',
      'bk.found':'Nel file:', 'bk.made':'creato il',
      'bk.empty':'Non c’è ancora niente da salvare.',
      'bk.saved':'File salvato: ', 'bk.shared':'Backup pronto: salvalo dove preferisci (File, email, WhatsApp…).',
      'bk.badfile':'File non leggibile: non è un backup di FishCast.',
      'bk.newer':'Questo backup viene da una versione più recente dell’app: aggiornala prima di importarlo.',
      'bk.merged':'Dati aggiunti:', 'bk.replaced':'Dati sostituiti:', 'bk.reloading':'Ricarico l’app…',
      'bk.note':'I tuoi dati stanno solo dentro questo telefono: se pulisci il browser o cambi dispositivo si perdono. Fai il backup ogni tanto e tienilo in un posto tuo (File, email, cloud). La licenza non è inclusa nel file: si riattiva col tuo codice.',
      // --- solunare & luna (solunar.js) ---
      'rail.sol':'Solunare', 'sl.title':'Solunare e Luna',
      'sl.today':'Periodi di oggi', 'sl.week':'Prossimi 7 giorni', 'sl.today_s':'oggi',
      'sl.cal':'Calendario: i giorni migliori', 'sl.periodsof':'Periodi del',
      'sl.sunrise':'Alba', 'sl.sunset':'Tramonto', 'sl.moonrise':'Luna sorge', 'sl.moonset':'Luna tramonta',
      'sl.major':'Periodo maggiore', 'sl.minor':'Periodo minore', 'sl.maj_s':'MAGG', 'sl.min_s':'min',
      'sl.zenith':'Luna allo zenit', 'sl.nadir':'Luna al nadir',
      'sl.inprogress':'in corso', 'sl.until':'fino alle', 'sl.nextis':'Prossimo', 'sl.at':'alle',
      'sl.nomore':'Nessun altro periodo oggi.', 'sl.tomorrow':'Domani',
      'sl.age':'età', 'sl.days':'giorni', 'sl.waxing':'crescente', 'sl.waning':'calante',
      'sl.nextnew':'nuova', 'sl.nextfull':'piena', 'sl.rating':'giornata',
      'sl.note':'Orari calcolati sul posto dal dispositivo (effemeridi Sole/Luna): funzionano anche senza rete. La teoria solunare è una regola empirica, non una legge dimostrata: usala insieme a mare, vento e marea.',
      'moon.new':'Luna nuova', 'moon.wax_cres':'Falce crescente', 'moon.first':'Primo quarto',
      'moon.wax_gib':'Gibbosa crescente', 'moon.full':'Luna piena', 'moon.wan_gib':'Gibbosa calante',
      'moon.last':'Ultimo quarto', 'moon.wan_cres':'Falce calante',
      // --- meteo-marino & marea (wx.js) ---
      'rail.wx':'Meteo', 'wx.title':'Meteo-marino',
      'wx.wind':'Vento', 'wx.gust':'Raffica', 'wx.wave':'Onda', 'wx.press':'Pressione',
      'wx.air':'Aria', 'wx.sea':'Mare', 'wx.sst':'temp. superficie', 'wx.nosea':'punto a terra',
      'wx.rising':'in aumento', 'wx.falling':'in calo', 'wx.steady':'stabile',
      'wx.chart':'Vento e onda — 48 h', 'wx.legend':'— onda   — vento   ·· raffiche',
      'wx.tide':'Marea — livello del mare', 'wx.high':'alta', 'wx.low':'bassa',
      'wx.noext':'nessun estremo nelle prossime 24 h',
      'wx.notide':'Marea non disponibile per questo punto',
      'wx.tidenote':'escursione mediterranea ridotta; valore modellato, non da mareografo',
      'wx.loading':'Carico i dati…', 'wx.updated':'aggiornato',
      'wx.stale':'Dati non aggiornati (sei offline o il servizio non risponde).',
      'wx.err':'Dati meteo non disponibili: serve la rete al primo caricamento.',
      'wx.src':'Dati meteo e marini: Open-Meteo (CC BY 4.0) — modelli ECMWF, DWD, GFS, Météo-France. Previsione: non usare per la navigazione.',
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
      'bi.now':'Bite now', 'bi.score':'score', 'bi.why':'Why this score?',
      'bi.windows':'Best windows (48 h)', 'bi.nowindow':'No window above 60/100 in the next 48 h',
      'bi.withwx':'solunar + sea and weather', 'bi.solonly':'solunar only: weather missing',
      'bi.excellent':'excellent', 'bi.good':'good', 'bi.fair':'fair', 'bi.poor':'weak', 'bi.bad':'poor',
      'bi.nearperiod':'Just outside a solunar period', 'bi.noperiod':'Outside the solunar periods',
      'bi.dawn':'First light: the best hour', 'bi.dusk':'Sunset: the best hour',
      'bi.night':'Night: good from shore', 'bi.day':'Broad daylight: the weakest window',
      'bi.nowave':'Wave data not available here', 'bi.flat':'Flat sea', 'bi.calmish':'Slight sea',
      'bi.ideal':'Just right from shore', 'bi.lively':'Lively, still fishable', 'bi.rough':'Rough',
      'bi.storm':'Storm: unfishable and dangerous',
      'bi.nowind':'Wind not available', 'bi.windcalm':'Almost calm', 'bi.windgood':'Helpful breeze',
      'bi.windfresh':'Fresh: harder casting', 'bi.windstrong':'Strong: poor fishing', 'bi.windgale':'Too much wind',
      'bi.nopress':'Pressure not available', 'bi.pdrop':'Pressure dropping sharply', 'bi.pfall':'Pressure falling',
      'bi.psteady':'Pressure steady', 'bi.prise':'Pressure rising', 'bi.pjump':'Pressure rising sharply',
      'bi.notide':'Tide not available', 'bi.tidefast':'Tide running well', 'bi.tidemove':'Tide moving',
      'bi.tideslow':'Tide slow', 'bi.tideslack':'Slack water',
      'bi.note':'Estimate from practical shore-fishing rules and solunar theory (solunar 30, light 20, waves 20, wind 15, pressure 10, tide 5). It is not a catch prediction.',
      'bi.cap_storm':'Sea too big: no shore fishing', 'bi.cap_rough':'Heavy swell: dangerous shoreline',
      'bi.cap_wind':'Too windy to cast',
      'cal.wxday':'with weather', 'sl.tapback':'tap “today” in the calendar to go back',
      'bk.title':'Data backup', 'bk.btn':'💾 Backup',
      'bk.onphone':'Right now on this phone:',
      'bk.marks':'catches/marks', 'bk.calib':'calibrations', 'bk.places':'places', 'bk.ports':'excluded harbours',
      'bk.export':'Save my data to a file', 'bk.import':'Restore from a file',
      'bk.merge':'Add to my data', 'bk.replace':'Replace everything', 'bk.cancel':'Cancel',
      'bk.found':'In the file:', 'bk.made':'created on',
      'bk.empty':'There is nothing to save yet.',
      'bk.saved':'File saved: ', 'bk.shared':'Backup ready: save it wherever you like (Files, email, WhatsApp…).',
      'bk.badfile':'Unreadable file: this is not a FishCast backup.',
      'bk.newer':'This backup comes from a newer version of the app: update it before importing.',
      'bk.merged':'Data added:', 'bk.replaced':'Data replaced:', 'bk.reloading':'Reloading the app…',
      'bk.note':'Your data lives only on this phone: clearing the browser or switching device loses it. Take a backup now and then and keep it somewhere of yours (Files, email, cloud). The licence is not included in the file: reactivate it with your code.',
      'rail.sol':'Solunar', 'sl.title':'Solunar & Moon',
      'sl.today':"Today's periods", 'sl.week':'Next 7 days', 'sl.today_s':'today',
      'sl.cal':'Calendar: the best days', 'sl.periodsof':'Periods of',
      'sl.sunrise':'Sunrise', 'sl.sunset':'Sunset', 'sl.moonrise':'Moonrise', 'sl.moonset':'Moonset',
      'sl.major':'Major period', 'sl.minor':'Minor period', 'sl.maj_s':'MAJOR', 'sl.min_s':'minor',
      'sl.zenith':'Moon overhead', 'sl.nadir':'Moon underfoot',
      'sl.inprogress':'in progress', 'sl.until':'until', 'sl.nextis':'Next', 'sl.at':'at',
      'sl.nomore':'No more periods today.', 'sl.tomorrow':'Tomorrow',
      'sl.age':'age', 'sl.days':'days', 'sl.waxing':'waxing', 'sl.waning':'waning',
      'sl.nextnew':'new', 'sl.nextfull':'full', 'sl.rating':'day rating',
      'sl.note':'Times are computed on your device from Sun/Moon ephemerides: they work offline too. Solunar theory is an empirical rule of thumb, not proven science: use it together with sea state, wind and tide.',
      'moon.new':'New moon', 'moon.wax_cres':'Waxing crescent', 'moon.first':'First quarter',
      'moon.wax_gib':'Waxing gibbous', 'moon.full':'Full moon', 'moon.wan_gib':'Waning gibbous',
      'moon.last':'Last quarter', 'moon.wan_cres':'Waning crescent',
      'rail.wx':'Weather', 'wx.title':'Marine weather',
      'wx.wind':'Wind', 'wx.gust':'Gusts', 'wx.wave':'Waves', 'wx.press':'Pressure',
      'wx.air':'Air', 'wx.sea':'Sea', 'wx.sst':'surface temp.', 'wx.nosea':'inland point',
      'wx.rising':'rising', 'wx.falling':'falling', 'wx.steady':'steady',
      'wx.chart':'Wind and waves — 48 h', 'wx.legend':'— waves   — wind   ·· gusts',
      'wx.tide':'Tide — sea level', 'wx.high':'high', 'wx.low':'low',
      'wx.noext':'no turning point in the next 24 h',
      'wx.notide':'Tide not available for this spot',
      'wx.tidenote':'small Mediterranean range; modelled value, not from a tide gauge',
      'wx.loading':'Loading data…', 'wx.updated':'updated',
      'wx.stale':'Data not up to date (you are offline or the service is down).',
      'wx.err':'Weather data unavailable: network is needed for the first load.',
      'wx.src':'Weather and marine data: Open-Meteo (CC BY 4.0) — ECMWF, DWD, GFS, Météo-France models. Forecast: not for navigation.',
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
