"use strict";
const $=id=>document.getElementById(id);
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }   // escape per testi utente nei popup
const map=L.map('map',{center:[41.35002,12.96553],zoom:16,zoomControl:true,attributionControl:true});   // Punto A9 (spot dell'utente) - default
try{ const _h=JSON.parse(localStorage.getItem('pr_home')||'null'); if(_h&&isFinite(_h.lat)) map.setView([_h.lat,_h.lng],_h.z||16); }catch(e){}   // partenza personalizzata salvata dall'utente
// Segnaposto fisso del punto di partenza A9 (sempre visibile)
const A9=[41.35002,12.96553];
const homeIcon=L.divIcon({className:'',html:'<div class="homepin">&#127907;</div>',iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-14]});
rulerSnappable(L.marker(A9,{icon:homeIcon,zIndexOffset:600,title:'A9 — il mio spot'}).addTo(map)
  .bindTooltip('A9',{permanent:true,direction:'top',offset:[0,-14],className:'homelbl'})
  .bindPopup('<b>&#127907; A9</b><br><span class="sub">il mio punto di partenza</span>'));

// Cellulare/touch: pannello chiuso + canaloni e righello attivi di default
const isMobile = !!(window.matchMedia && (window.matchMedia('(pointer:coarse)').matches || window.innerWidth<820));
// Pannello dei comandi a scomparsa (stato ricordato)
function showPanel(open){ $('panel').style.display=open?'':'none'; $('panelOpen').style.display=open?'none':'flex'; localStorage.setItem('pr_panel',open?'open':'closed'); }
$('panelHide').onclick=()=>showPanel(false);
$('panelOpen').onclick=()=>showPanel(true);
const _savedPanel=localStorage.getItem('pr_panel');
if(_savedPanel==='closed' || (_savedPanel===null && isMobile)) showPanel(false);   // su cellulare: chiuso di default
if(isMobile) setTimeout(()=>{   // attiva canaloni + righello dopo il caricamento iniziale
  if($('lCanal') && !$('lCanal').checked){ $('lCanal').checked=true; $('lCanal').onchange(); }
  if($('lRuler') && !$('lRuler').checked){ $('lRuler').checked=true; $('lRuler').onchange(); }
}, 1800);
map.attributionControl.setPrefix('FishCast');

// ---- BASI ----
const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {maxZoom:19, attribution:'Imagery &copy; Esri, Maxar'});
const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'&copy; OpenStreetMap'});
sat.addTo(map);
$('baseSat').onchange=()=>{ map.removeLayer(osm); sat.addTo(map); };
$('baseOsm').onchange=()=>{ map.removeLayer(sat); osm.addTo(map); };

// ---- BATIMETRIA EMODnet (WMS raster, sopra la base) ----
const EMOD='https://ows.emodnet-bathymetry.eu/wms';
const contours=L.tileLayer.wms(EMOD,{layers:'emodnet:contours',format:'image/png',transparent:true,opacity:0.85,attribution:'&copy; EMODnet Bathymetry'});
contours.addTo(map);   // isobate EMODnet ON (utili offshore); la batimetria a colori EMODnet e' rimossa: inutile sottocosta (nativo ~115 m) -> si usa la SDB satellitare
// Carta nautica OpenSeaMap (ODbL): segnali/boe/scandagli dove mappati
const seamark=L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{maxZoom:18,opacity:1,attribution:'&copy; OpenSeaMap (ODbL)'});

// ---- SUBSTRATO (EUSeaMap 2023) + POSIDONIA (EMODnet Seabed Habitats) ----
const SBH='https://ows.emodnet-seabedhabitats.eu/geoserver/emodnet_view/wms';
// Substrato: EMODnet Geology (Folk 5) - copre il sottocosta (EUSeaMap era vuoto qui). Posidonia: EMODnet Seabed Habitats
const GEO='https://drive.emodnet-geology.eu/geoserver/wms';
const substrate=L.tileLayer.wms(GEO,{layers:'cp_wp3_seabed_substrate_folk_5',format:'image/png',transparent:true,opacity:0.7,version:'1.3.0',attribution:'&copy; EMODnet Geology (substrato Folk)'});
const posidonia=L.tileLayer.wms(SBH,{layers:'seagrass_eov_poly_2025',format:'image/png',transparent:true,opacity:0.7,attribution:'&copy; EMODnet Seabed Habitats'});

function bind(chk,layer){ $(chk).onchange=()=>{ if($(chk).checked) layer.addTo(map); else map.removeLayer(layer); updLegend(); }; }
bind('lContours',contours); bind('lSub',substrate); bind('lPos',posidonia); bind('lSeamark',seamark);
// Due slider separati: profondità (SDB + batimetria) e habitat (substrato/Posidonia)
function updSdbOv(){ const o=$('ovSdb').value/100; $('ovSdbV').textContent=$('ovSdb').value+'%'; if(sdbOverlay) sdbOverlay.setOpacity(o); }
function updHabOv(){ const o=$('ovHab').value/100; $('ovHabV').textContent=$('ovHab').value+'%'; substrate.setOpacity(o); posidonia.setOpacity(o); }
$('ovSdb').oninput=updSdbOv; $('ovHab').oninput=updHabOv;

// ---- LEGENDA (mostra quando substrato/posidonia attivi) ----
function updLegend(){
  const rows=[];
  if($('lPos').checked) rows.push(['#1a8f3c','Posidonia (prateria)']);
  if($('lSub').checked){ rows.push(['#f2e394','Sedimento fine / sabbia']); rows.push(['#c8a45a','Sabbia grossa / ghiaia']); rows.push(['#9a9a9a','Roccia / substrato duro']); rows.push(['#6b8fb5','Fango / infralitorale']); }
  if($('lCanal')&&$('lCanal').checked){ rows.push(['#7e42e0','Canalone marcato (buca)']); rows.push(['#2e74f0','Canalone']); rows.push(['#56c8f0','Truogolo lieve']); rows.push(['#e8c478','Barra / secca']); }
  const el=$('legend');
  if(!rows.length){ el.style.display='none'; return; }
  el.innerHTML='<div style="color:#16e0ff;font-weight:700;margin-bottom:3px">Fondale</div>'+
    rows.map(r=>'<div class="row"><i style="background:'+r[0]+'"></i>'+r[1]+'</div>').join('')+
    '<div style="color:#8fb0cc;font-size:9.5px;margin-top:3px">colori indicativi &middot; tocca per il tipo esatto</div>';
  el.style.display='block';
}

// ---- PROFONDITA' AL TOCCO (EMODnet WCS GeoTIFF, ~115 m) + tipo di fondale (GetFeatureInfo) ----
const NATIVE=0.0010416666666666667;
const WCS='https://ows.emodnet-bathymetry.eu/wcs?service=WCS&version=2.0.1&request=GetCoverage&coverageId=emodnet__mean&format=image/tiff';
function fetchTO(url,ms,opts){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);return fetch(url,Object.assign({signal:c.signal},opts||{})).finally(()=>clearTimeout(t));}
async function depthAt(lat,lon){
  try{ const d=0.02, url=WCS+'&subset=Lat('+(lat-d)+','+(lat+d)+')&subset=Long('+(lon-d)+','+(lon+d)+')&scalefactor=0.2';
    const r=await fetchTO(url,20000); if(!r.ok) return null; const buf=await r.arrayBuffer();
    const tif=await GeoTIFF.fromArrayBuffer(buf); const img=await tif.getImage(); const data=(await img.readRasters())[0];
    const v=data[Math.floor(img.getHeight()/2)*img.getWidth()+Math.floor(img.getWidth()/2)];
    return (v>-8000&&v<200)?v:null; }catch(e){ return null; }
}
// GetFeatureInfo sul substrato: che habitat/fondale c'è nel punto
async function habitatAt(lat,lon){
  try{
    const p=map.latLngToContainerPoint([lat,lon]), s=map.getSize(), b=map.getBounds();
    const pos=$('lPos').checked, base=pos?SBH:GEO, layer=pos?'seagrass_eov_poly_2025':'cp_wp3_seabed_substrate_folk_5';
    const url=base+'?service=WMS&version=1.3.0&request=GetFeatureInfo&crs=CRS:84'+
      '&bbox='+b.getWest()+','+b.getSouth()+','+b.getEast()+','+b.getNorth()+
      '&width='+Math.round(s.x)+'&height='+Math.round(s.y)+'&i='+Math.round(p.x)+'&j='+Math.round(p.y)+
      '&layers='+layer+'&query_layers='+layer+'&info_format=application/json&feature_count=1';
    const r=await fetchTO(url,15000); if(!r.ok) return null; const j=await r.json();
    if(!j.features||!j.features.length) return null; const pr=j.features[0].properties||{};
    if(pos) return pr.AllcombD || pr.hab_type || pr.Habitat || pr.name || 'Posidonia';
    const t=pr.folk_5cl_txt||pr.original_substrate||pr.folk_7cl_txt; return t?(''+t).replace(/^\d+\.\s*/,''):null;
  }catch(e){ return null; }
}
// ---- RIGHELLO LANCIO (2 punti A/B trascinabili, distanza sulla linea) ----
let rulerPts=[], rulerLine=null, rulerMarks=[], rulerLbl=null, rulerDragging=false, rulerDragEnd=0;
function fmtM(m){ return m>=1000 ? (m/1000).toFixed(2)+' km' : Math.round(m)+' m'; }
function rulerIcon(l){ return L.divIcon({className:'',html:'<div class="rmk">'+l+'</div>',iconSize:[22,22],iconAnchor:[11,11]}); }
// Aggancio del righello ai segnaposto (canaloni, catture, A9, "sei qui"): col righello attivo,
// toccare un marker mette il punto B ESATTAMENTE sulle sue coordinate (invece di aprirne il popup).
function rulerAddPoint(ll){ const p=[ll.lat,ll.lng]; if(rulerPts.length>=2) rulerPts[1]=p; else rulerPts.push(p); drawRuler(); }
function rulerSnappable(m){ if(m&&m.on){ m.on('click',function(){ if($('lRuler')&&$('lRuler').checked) rulerAddPoint(m.getLatLng()); });
  m.on('popupopen',function(){ if($('lRuler')&&$('lRuler').checked && m.closePopup) m.closePopup(); }); }   // col righello attivo il popup non deve aprirsi (evita la race con closePopup)
  return m; }
function drawRuler(){
  rulerMarks.forEach(m=>map.removeLayer(m)); rulerMarks=[];
  rulerPts.forEach((p,idx)=>{ const m=L.marker(p,{icon:rulerIcon(idx===0?'A':'B'),draggable:true,autoPan:true}).addTo(map);
    m.on('dragstart',()=>{ rulerDragging=true; });
    m.on('drag',e=>{ const ll=e.target.getLatLng(); rulerPts[idx]=[ll.lat,ll.lng]; redrawRulerLine(false); });
    m.on('dragend',e=>{ const ll=e.target.getLatLng(); rulerPts[idx]=[ll.lat,ll.lng]; rulerDragging=false; rulerDragEnd=Date.now(); redrawRulerLine(true); });
    rulerMarks.push(m); });
  redrawRulerLine(true);
}
function redrawRulerLine(withProfile){
  if(rulerLine){ map.removeLayer(rulerLine); rulerLine=null; }
  if(rulerLbl){ map.removeLayer(rulerLbl); rulerLbl=null; }
  if(rulerPts.length>=2){
    rulerLine=L.polyline(rulerPts,{color:'#ff5be0',weight:3,dashArray:'6,5'}).addTo(map);
    const d=map.distance(rulerPts[0],rulerPts[1]), mid=[(rulerPts[0][0]+rulerPts[1][0])/2,(rulerPts[0][1]+rulerPts[1][1])/2];
    rulerLbl=L.marker(mid,{icon:L.divIcon({className:'',html:'<div class="rlbl">'+fmtM(d)+'</div>',iconSize:[0,0]}),interactive:false,keyboard:false}).addTo(map);
    $('info').style.display='none'; if(withProfile) drawProfile(rulerPts);
  } else $('profile').style.display='none';
}
// Profondità SDB a un punto (metri negativi) o null
function sdbDepthAt(lat,lng){ if(!sdbGrid) return null; const g=sdbGrid,b=g.bnds;
  if(lat>b.getNorth()||lat<b.getSouth()||lng<b.getWest()||lng>b.getEast()) return null;
  const px=Math.round((lng-b.getWest())/(b.getEast()-b.getWest())*(g.W-1)), py=Math.round((b.getNorth()-lat)/(b.getNorth()-b.getSouth())*(g.H-1));
  const z=g.depth[py*g.W+px]; return isFinite(z)?z:null; }
// Prede probabili per distanza dalla riva, affinata con SUBSTRATO e STAGIONE (litorale tirrenico, indicativo)
// sub: substrati preferiti (sabbia/misto/roccia/posidonia/fango) o 'any'. mesi: mesi di presenza/attivita' (1-12).
const A=[1,2,3,4,5,6,7,8,9,10,11,12];
const PREY=[
  {n:'Mormora',e:'🐟',dmin:0,dmax:160,sub:['sabbia','misto'],mesi:A,note:'sabbia e risacca, tutto l\'anno',esca:'arenicola, coreano, bibi — a fondo (surfcasting), finale lungo con perline'},
  {n:'Spigola',e:'🐟',dmin:0,dmax:90,sub:['any'],mesi:[1,2,3,4,10,11,12],note:'risacca, foci, mareggiata — autunno/inverno',esca:'pesce vivo/latterino, bibi, artificiali (minnow) — a fondo o a spinning in risacca'},
  {n:'Orata',e:'🐟',dmin:30,dmax:170,sub:['sabbia','misto'],mesi:[5,6,7,8,9,10,11],note:'sabbia, cerca molluschi — tarda primavera/autunno',esca:'cannolicchio, cozza, gambero, bibi — a fondo, terminale robusto (denti forti)'},
  {n:'Cefalo/Muggine',e:'🐟',dmin:0,dmax:80,sub:['any'],mesi:A,note:'sottoriva, foci e canali',esca:'pane, bigattino, pasta — a galleggiante leggero, amo piccolo'},
  {n:'Sogliola',e:'🐟',dmin:10,dmax:150,sub:['sabbia','fango'],mesi:[10,11,12,1,2,3,4],note:'piatto di sabbia, spesso di notte',esca:'arenicola, coreano, camola di miele — a fondo lento, di notte'},
  {n:'Rombo',e:'🐟',dmin:40,dmax:250,sub:['sabbia','misto'],mesi:[3,4,5,6,9,10,11],note:'piatto predatore in agguato nella sabbia',esca:'pesce esca vivo (latterino), striscia di calamaro — a fondo o traina leggera'},
  {n:'Seppia',e:'🦑',dmin:0,dmax:120,sub:['sabbia','posidonia','misto'],mesi:[2,3,4,5,6,9,10],note:'primavera sotto costa',esca:'seppiara/totanara con pesce finto — a strappi lenti da riva/molo'},
  {n:'Calamaro',e:'🦑',dmin:0,dmax:150,sub:['any'],mesi:[9,10,11,12,1,2],note:'autunno-inverno, di notte',esca:'totanara luminosa — di notte da molo/riva, recupero a scatti'},
  {n:'Polpo',e:'🐙',dmin:0,dmax:120,sub:['roccia','misto','posidonia'],mesi:A,note:'roccia/misto — meglio in autunno',esca:'polpara con esca (pesce/granchio) — a saltelli sul fondo roccioso'},
  {n:'Aguglia',e:'🐟',dmin:0,dmax:120,sub:['any'],mesi:[4,5,6,7,8,9],note:'in superficie — primavera/estate',esca:'pezzetto di sarda/bianchetto — a galleggiante in superficie'},
  {n:'Leccia',e:'🐟',dmin:0,dmax:110,sub:['any'],mesi:[6,7,8,9],note:'predatore, estate sotto costa',esca:'artificiali (pesciolino/spoon), pesce vivo — a spinning veloce'},
  {n:'Latterini/minutaglia',e:'🐟',dmin:0,dmax:30,sub:['any'],mesi:A,note:'battigia',esca:'amo piccolo con bigattino, o rete a bilancia — utili anche come esca viva'},
  {n:'Tracina',e:'⚠️',dmin:15,dmax:130,sub:['sabbia'],mesi:[5,6,7,8,9,10],note:'infossata nella sabbia — velenosa',esca:'non è preda target; abbocca a esche da fondo. ⚠️ aculei velenosi: slamala con cautela'},
  {n:'Occhiata',e:'🐟',dmin:30,dmax:160,sub:['roccia','misto','posidonia'],mesi:A,note:'colonna d\'acqua, misto/roccia',esca:'pane, bigattino, gambero — a galleggiante, con pastura'},
  {n:'Salpa',e:'🐟',dmin:20,dmax:120,sub:['posidonia','roccia'],mesi:[4,5,6,7,8,9,10],note:'erbivora, presso alga/Posidonia',esca:'pane, alga/verdura — a galleggiante presso la Posidonia'},
  {n:'Sarago',e:'🐟',dmin:40,dmax:220,sub:['roccia','misto'],mesi:A,note:'roccia/misto, scogliere — grossi in autunno/inverno',esca:'gambero, cozza, granchio, arenicola — a fondo o galleggiante presso gli scogli'},
  {n:'Anguilla',e:'🐟',dmin:0,dmax:60,sub:['sabbia','fango'],mesi:[3,4,9,10,11],note:'foci e canali di Sabaudia, di notte',esca:'verme/bibi, pezzo di pesce — a fondo di notte alle foci'},
  {n:'Ombrina',e:'🐟',dmin:80,dmax:260,sub:['sabbia','misto'],mesi:[5,6,7,8,9,10],note:'buche oltre la barra, spesso di notte',esca:'bibi grosso, arenicola, trancio di sarda — a fondo (surfcasting), spesso di notte'},
  {n:'Gronco',e:'🐟',dmin:60,dmax:220,sub:['roccia','misto'],mesi:A,note:'roccia, di notte',esca:'trancio di sarda/calamaro/sgombro — a fondo robusto, di notte su roccia'},
  {n:'Razza',e:'🐟',dmin:110,dmax:300,sub:['sabbia','fango'],mesi:[1,2,3,10,11,12],note:'sabbia profonda, di notte — mesi freddi',esca:'trancio di pesce/calamaro, sardina — a fondo, di notte'}
];
function preyChip(p,off){ const i=PREY.indexOf(p); return '<span class="pchip'+(p.e==='⚠️'?' warn':'')+(off?' off':'')+'" onclick="prPreyPick('+i+')" title="tocca per l\'esca">'+p.e+' '+p.n+(p.orario==='n'?' 🌙':'')+'</span>'; }
window.prPreyPick=function(i){ const p=PREY[i]; if(!p) return; $('info').style.display='block';
  $('info').innerHTML='🎣 <b>'+p.n+'</b> &middot; <span class="sub">'+({g:'☀️ giorno',n:'🌙 notte',gn:'☀️/🌙 giorno e notte'}[p.orario]||'')+'</span><br><span class="sub">'+p.note+'</span><br>Esca/tecnica: <b>'+p.esca+'</b>';
  if(typeof infoT!=='undefined'){ clearTimeout(infoT); infoT=setTimeout(()=>$('info').style.display='none',14000); } };
// Orario di pesca per specie: g=giorno, n=notte, gn=entrambi (assegnato senza riscrivere il dataset)
const PREY_TIME={Mormora:'gn',Spigola:'gn',Orata:'g','Cefalo/Muggine':'g',Sogliola:'n',Rombo:'gn',Seppia:'gn',Calamaro:'n',Polpo:'gn',Aguglia:'g',Leccia:'g','Latterini/minutaglia':'g',Tracina:'gn',Occhiata:'g',Salpa:'g',Sarago:'gn',Anguilla:'n',Ombrina:'n',Gronco:'n',Razza:'n'};
PREY.forEach(p=>p.orario=PREY_TIME[p.n]||'gn');
let preyTime='all';   // 'all' | 'g' | 'n'
function matchTime(p){ return preyTime==='all' || (p.orario||'gn').includes(preyTime); }
function seasonName(m){ return (m>=3&&m<=5)?'primavera':(m>=6&&m<=8)?'estate':(m>=9&&m<=11)?'autunno':'inverno'; }
// Mappa una classe di habitat EUNIS/EMODnet in una categoria di substrato
function habCat(s){ if(!s) return null; s=(''+s).toLowerCase();
  if(s.includes('posidonia')||s.includes('seagrass')||s.includes('zostera')||s.includes('maerl')) return 'posidonia';
  if(s.includes('rock')||s.includes('reef')||s.includes('roccia')||s.includes('boulder')||s.includes('hard substrat')) return 'roccia';
  if(s.includes('coarse')||s.includes('gravel')||s.includes('mixed')||s.includes('misto')||s.includes('pebble')||s.includes('cobble')) return 'misto';
  if(s.includes('sand')||s.includes('sabbia')) return 'sabbia';   // "muddy sand" -> sabbia (sabbia prevale sul fango)
  if(s.includes('mud')||s.includes('silt')||s.includes('fango')) return 'fango';
  if(s.includes('sediment')||s.includes('fine')) return 'sabbia';
  return null; }
// Substrato al punto d'arrivo (query EMODnet Seabed Habitats), indipendente dai layer accesi
async function substrateCat(lat,lon){ try{
  const p=map.latLngToContainerPoint([lat,lon]), s=map.getSize(), b=map.getBounds(), layer='cp_wp3_seabed_substrate_folk_5';
  const url=GEO+'?service=WMS&version=1.3.0&request=GetFeatureInfo&crs=CRS:84&bbox='+b.getWest()+','+b.getSouth()+','+b.getEast()+','+b.getNorth()+
    '&width='+Math.round(s.x)+'&height='+Math.round(s.y)+'&i='+Math.round(p.x)+'&j='+Math.round(p.y)+'&layers='+layer+'&query_layers='+layer+'&info_format=application/json&feature_count=1';
  const r=await fetchTO(url,15000); if(!r.ok) return null; const j=await r.json();
  if(!j.features||!j.features.length) return null; const pr=j.features[0].properties||{};
  return habCat(pr.folk_5cl_txt||pr.original_substrate||pr.folk_7cl_txt); }catch(e){ return null; } }
const SUBLAB={sabbia:'sabbia',misto:'misto/ghiaia',roccia:'roccia',posidonia:'Posidonia',fango:'fango'};
function renderPrey(distM, subCat){ const row=$('preyRow'); if(distM==null||!isFinite(distM)){ row.innerHTML=''; return; }
  const mo=new Date().getMonth()+1;
  let list=PREY.filter(p=>distM>=p.dmin-10 && distM<=p.dmax+10);          // 1) distanza
  list=list.filter(p=>p.mesi.includes(mo));                               // 2) stagione (mese corrente)
  list=list.filter(matchTime);                                           // 3) giorno/notte
  if(subCat){ const m=list.filter(p=>p.sub.includes('any')||p.sub.includes(subCat)); if(m.length) list=m; }  // 4) substrato (se noto)
  list.sort((a,b)=>{ const as=subCat&&a.sub.includes(subCat)&&!a.sub.includes('any')?0:1, bs=subCat&&b.sub.includes(subCat)&&!b.sub.includes('any')?0:1; return as-bs; });
  const tlab={all:'',g:' &middot; ☀️ giorno',n:' &middot; 🌙 notte'}[preyTime];
  const hdr='Prede probabili a '+fmtM(distM)+' &middot; '+seasonName(mo)+(subCat?(' &middot; fondo '+(SUBLAB[subCat]||subCat)):' &middot; fondo n/d')+tlab;
  row.innerHTML='<span class="plab">'+hdr+':</span>'+
    (list.length?list.map(preyChip).join(''):'<span class="plab">poche specie di stagione a questa distanza</span>'); }
// Scheda "Prede probabili" sempre accessibile, per fasce di distanza e filtrata per stagione
const PZONES=[{t:'Sottoriva — 0-50 m',d:25},{t:'Media distanza — 50-120 m',d:85},{t:'Lontano — oltre 120 m',d:180}];
function renderPreyPanel(){ const mo=new Date().getMonth()+1;
  let h='<div class="psub">Stagione attuale: <b>'+seasonName(mo)+'</b> &middot; quelle <span style="opacity:.5">in grigio</span> sono <b>fuori stagione ora</b>; 🌙 = specie da notte. <b>Tocca una specie</b> per esca e tecnica.</div>';
  for(const z of PZONES){ const list=PREY.filter(p=>z.d>=p.dmin&&z.d<=p.dmax&&matchTime(p))
      .sort((a,b)=>(b.mesi.includes(mo)?1:0)-(a.mesi.includes(mo)?1:0));
    h+='<div class="pzone"><div class="pzt">'+z.t+'</div><div class="pchips">'+
       (list.length?list.map(p=>preyChip(p,!p.mesi.includes(mo))).join(''):'<span class="psub">&mdash; nessuna con questo filtro</span>')+'</div></div>'; }
  h+='<div class="psub" style="margin-top:8px">⚠️ tracina velenosa &middot; 🦑 seppia/calamaro e 🐙 polpo &middot; col <b>Righello lancio</b> le prede si affinano anche col <b>fondo</b>. Indicazione di massima: varia con orario, mareggiata e stagione.</div>';
  $('preyBody').innerHTML=h;
  Array.from($('preyTimeSel').children).forEach(s=>s.classList.toggle('on',s.dataset.t===preyTime)); }
function setPreyTime(t){ preyTime=t; renderPreyPanel(); if(rulerPts.length>=2) drawProfile(rulerPts); }
$('btnPrey').onclick=()=>{ renderPreyPanel(); $('preyPanel').style.display='block'; };
$('preyClose').onclick=()=>{ $('preyPanel').style.display='none'; };
// Profilo del fondale lungo la linea di lancio
let lastProfile=null, profileBase=null, profDot=null;
function clearProfDot(){ if(profDot){ map.removeLayer(profDot); profDot=null; } }
function drawProfile(pts){ const cv=$('profCv'),W=cv.width,H=cv.height,ctx=cv.getContext('2d');
  let total=0; const segD=[0]; for(let i=1;i<pts.length;i++){ total+=map.distance(pts[i-1],pts[i]); segD.push(total); }
  if(total<=0){ $('profile').style.display='none'; return; }
  clearProfDot();   // il pallino si rimette al prossimo tocco sul grafico
  renderPrey(total, null);
  const land=pts[pts.length-1];   // punto d'arrivo del lancio -> substrato reale (async)
  substrateCat(land[0],land[1]).then(cat=>{ if(cat) renderPrey(total, cat); }).catch(()=>{});
  const N=140, samp=[]; let anyDepth=false, maxDepth=0;
  for(let k=0;k<=N;k++){ const dd=total*k/N; let si=1; while(si<pts.length&&segD[si]<dd) si++;
    const a=pts[si-1], q=pts[si]||pts[si-1], segLen=(segD[si]-segD[si-1])||1, t=(dd-segD[si-1])/segLen;
    const lat=a[0]+(q[0]-a[0])*t, lng=a[1]+(q[1]-a[1])*t, z=sdbDepthAt(lat,lng);
    samp.push({d:dd,z}); if(z!=null){ anyDepth=true; if(-z>maxDepth) maxDepth=-z; } }
  ctx.clearRect(0,0,W,H);
  if(!anyDepth){ lastProfile=null; profileBase=null; $('profTxt').innerHTML='Lancio <b>'+fmtM(total)+'</b> &middot; attiva <b>SDB</b> per il profilo del fondale';
    ctx.fillStyle='#8fb0cc'; ctx.font='22px system-ui'; ctx.textAlign='center'; ctx.fillText('nessuna profondità satellitare su questa linea',W/2,H/2); ctx.textAlign='left'; $('profile').style.display='block'; return; }
  const padL=52,padR=12,padT=12,padB=22, plotW=W-padL-padR, plotH=H-padT-padB;
  const dmax=Math.max(5,Math.ceil(maxDepth/2)*2), X=d=>padL+d/total*plotW, Y=m=>padT+(m/dmax)*plotH;
  ctx.strokeStyle='#20344c'; ctx.lineWidth=1; ctx.fillStyle='#8fb0cc'; ctx.font='16px system-ui';
  const marks=[0,2,5,10,15,20,30].filter(m=>m<=dmax); if(marks[marks.length-1]!==dmax) marks.push(dmax);
  marks.forEach(m=>{ const y=Y(m); ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(W-padR,y);ctx.stroke(); ctx.fillText(m===0?'0':('-'+m),6,y+5); });
  // riempimento acqua (superficie -> fondale)
  ctx.beginPath(); ctx.moveTo(X(0),Y(0));
  for(const s of samp) ctx.lineTo(X(s.d), s.z!=null?Y(-s.z):Y(0));
  ctx.lineTo(X(total),Y(0)); ctx.closePath();
  const grd=ctx.createLinearGradient(0,padT,0,padT+plotH); grd.addColorStop(0,'rgba(22,224,255,.32)'); grd.addColorStop(1,'rgba(8,36,72,.60)'); ctx.fillStyle=grd; ctx.fill();
  // linea del fondale
  ctx.beginPath(); let first=true; for(const s of samp){ if(s.z==null) continue; const x=X(s.d),y=Y(-s.z); if(first){ctx.moveTo(x,y);first=false;} else ctx.lineTo(x,y); }
  ctx.strokeStyle='#16e0ff'; ctx.lineWidth=2.5; ctx.stroke();
  profileBase=ctx.getImageData(0,0,W,H); lastProfile={total,padL,padT,plotW,plotH,dmax,samp};   // per il click sul grafico
  const calib=sdbGrid&&sdbGrid.calib;
  $('profTxt').innerHTML='<b>Profilo fondale</b> &middot; lancio '+fmtM(total)+' &middot; max &minus;'+maxDepth.toFixed(1)+' m'+(calib?'':' <span class="sub">(relativo)</span>')+' &middot; <span class="sub">tocca il grafico</span>';
  $('profile').style.display='block'; }
// Click sul grafico: mostra distanza dal punto A + profondità in quel punto
function markProfileAt(d){ if(!lastProfile||!profileBase) return; const lp=lastProfile, cv=$('profCv'), ctx=cv.getContext('2d');
  d=Math.max(0,Math.min(lp.total,d)); ctx.putImageData(profileBase,0,0);
  const X=x=>lp.padL+x/lp.total*lp.plotW, Y=m=>lp.padT+(m/lp.dmax)*lp.plotH;
  const kf=d/lp.total*(lp.samp.length-1), k0=Math.floor(kf), k1=Math.min(lp.samp.length-1,k0+1), t=kf-k0;
  const z0=lp.samp[k0].z, z1=lp.samp[k1].z, z=(z0!=null&&z1!=null)?(z0+(z1-z0)*t):(z0!=null?z0:z1);
  const x=X(d);
  ctx.strokeStyle='#ffd54a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,lp.padT); ctx.lineTo(x,lp.padT+lp.plotH); ctx.stroke();
  if(z!=null){ const y=Y(-z); ctx.fillStyle='#ffd54a'; ctx.beginPath(); ctx.arc(x,y,6,0,7); ctx.fill(); ctx.strokeStyle='#04121e'; ctx.lineWidth=2; ctx.stroke(); }
  $('profTxt').innerHTML='<b>&#128205; Da A: '+fmtM(d)+'</b>'+(z!=null?(' &middot; profondità <b>&minus;'+Math.abs(z).toFixed(1)+' m</b>'):' &middot; fuori dai dati')+' <span class="sub">&middot; tocca un altro punto</span>';
  // pallino corrispondente sulla linea A-B nella mappa
  if(rulerPts.length>=2){ const A=rulerPts[0], B=rulerPts[1], tt=lp.total?d/lp.total:0, ll=[A[0]+(B[0]-A[0])*tt, A[1]+(B[1]-A[1])*tt];
    if(!profDot) profDot=L.circleMarker(ll,{radius:7,color:'#04121e',fillColor:'#ffd54a',fillOpacity:1,weight:2,interactive:false}).addTo(map);
    else profDot.setLatLng(ll); }
}
$('profCv').addEventListener('click', e=>{ if(!lastProfile) return; const cv=$('profCv'), r=cv.getBoundingClientRect();
  const cx=(e.clientX-r.left)/r.width*cv.width; markProfileAt((cx-lastProfile.padL)/lastProfile.plotW*lastProfile.total); });
$('profClose').onclick=()=>{ $('profile').style.display='none'; clearProfDot(); };
$('lRuler').onchange=()=>{ rulerPts=[]; drawRuler();
  if($('lRuler').checked){ $('info').style.display='block'; $('info').innerHTML='<b>Righello lancio</b>: tocca il punto <b>A</b> (riva) e il punto <b>B</b> (meta del lancio)<br><span class="sub">trascina A e B per aggiustare &middot; tocca un <b>canalone</b>/una cattura per agganciare B esatto &middot; con SDB attiva vedi il profilo</span>'; }
  else { $('info').style.display='none'; $('profile').style.display='none'; clearProfDot(); } };

let infoT=null;
map.on('click', async e=>{
  const {lat,lng}=e.latlng;
  if(calibrating){ addCalibPoint(e.latlng); return; }   // modo "calibra profondità con punto noto"
  if(marking){ openMarkForm(e.latlng); return; }   // modo "segna punto/cattura"
  if($('lRuler').checked){ if(rulerDragging||Date.now()-rulerDragEnd<400) return;   // non resettare per un click residuo del drag
    if(rulerPts.length>=2) rulerPts=[[lat,lng]]; else rulerPts.push([lat,lng]); drawRuler(); return; }
  // Profondità dalla SDB satellitare (10 m) se disponibile e nel riquadro
  if(sdbGrid){ const g=sdbGrid,b=g.bnds;
    if(lat<=b.getNorth()&&lat>=b.getSouth()&&lng>=b.getWest()&&lng<=b.getEast()){
      const px=Math.round((lng-b.getWest())/(b.getEast()-b.getWest())*(g.W-1)), py=Math.round((b.getNorth()-lat)/(b.getNorth()-b.getSouth())*(g.H-1));
      const z=g.depth[py*g.W+px];
      if(isFinite(z)){ $('info').style.display='block';
        $('info').innerHTML='Profondità <b>satellite ~10 m</b>: '+(g.calib?('<b>'+Math.abs(z).toFixed(1)+' m</b>'):('rel. '+Math.round(-z/15*100)+'%'))+
          '<br><span class="sub">'+lat.toFixed(5)+', '+lng.toFixed(5)+' &middot; SDB Sentinel-2, stima</span>';
        clearTimeout(infoT); infoT=setTimeout(()=>$('info').style.display='none',9000); return; }
    }
  }
  $('info').style.display='block';
  $('info').innerHTML='Leggo profondità e fondale&hellip;<br><span class="sub">'+lat.toFixed(5)+', '+lng.toFixed(5)+'</span>';
  clearTimeout(infoT);
  const [d,h]=await Promise.all([depthAt(lat,lng), (($('lSub').checked||$('lPos').checked)?habitatAt(lat,lng):Promise.resolve(null))]);
  const dep = d==null ? '—' : (d>=0 ? ('terra +'+Math.round(d)+' m') : ('<b>'+Math.abs(Math.round(d))+' m</b> di fondale'));
  $('info').innerHTML='Profondità: '+dep+(h?(' &middot; fondale: <b>'+h+'</b>'):'')+
    '<br><span class="sub">'+lat.toFixed(5)+', '+lng.toFixed(5)+' &middot; profondità EMODnet ~115 m (stima)</span>';
  infoT=setTimeout(()=>{ $('info').style.display='none'; }, 9000);
});
updLegend();

// ================= SDB SATELLITARE (Sentinel-2, Stumpf log-ratio, senza credenziali) =================
// STAC Earth Search (AWS Open Data) -> legge B02(blu)/B03(verde)/B08(NIR) come COG con range request ->
// pSDB = ln(blu)/ln(verde), normalizzato sull'acqua (maschera NDWI) -> profondita' RELATIVA sottocosta (~10 m).
// Stima da satellite: valida in acqua limpida 0-15 m, NON e' dato batimetrico ufficiale.
let sdbOverlay=null, sdbBusy=false, sdbScenes=[], sdbGrid=null;
const ISO=[-2,-5,-10,-15];   // isobate evidenziate (m)
function sdbColor(depth){ // depth negativo (m): 0=chiaro .. -15=blu scuro
  let t=Math.min(1,Math.max(0,(-depth)/15)); const stops=[[0,[190,240,255]],[0.35,[95,185,235]],[0.7,[35,110,200]],[1,[10,40,110]]];
  for(let i=1;i<stops.length;i++){ if(t<=stops[i][0]){ const a=stops[i-1],b=stops[i],k=(t-a[0])/(b[0]-a[0]);
    return [Math.round(a[1][0]+(b[1][0]-a[1][0])*k),Math.round(a[1][1]+(b[1][1]-a[1][1])*k),Math.round(a[1][2]+(b[1][2]-a[1][2])*k)]; } }
  return stops[3][1];
}
// Calibrazione: griglia EMODnet (WCS) sul bbox + campionamento + fit lineare pSDB->profondità
async function emodnetGrid(bn){
  const d=0.006,S=bn.getSouth()-d,N=bn.getNorth()+d,Wd=bn.getWest()-d,E=bn.getEast()+d;
  const url=WCS+'&subset=Lat('+S+','+N+')&subset=Long('+Wd+','+E+')&scalefactor=1';
  const r=await fetchTO(url,25000); if(!r.ok) return null; const buf=await r.arrayBuffer();
  const tif=await GeoTIFF.fromArrayBuffer(buf); const img=await tif.getImage(); const data=(await img.readRasters())[0];
  return {data,w:img.getWidth(),h:img.getHeight(),N,S,W:Wd,E};
}
function emodAt(g,lat,lon){ if(!g||lat>g.N||lat<g.S||lon<g.W||lon>g.E) return null;
  const j=Math.round((lon-g.W)/((g.E-g.W)/(g.w-1))), i=Math.round((g.N-lat)/((g.N-g.S)/(g.h-1)));
  if(i<0||i>=g.h||j<0||j>=g.w) return null; const v=g.data[i*g.w+j]; return (v>-8000&&v<200)?v:null; }
function linfit(xs,ys){ const n=xs.length; if(n<8) return null; let sx=0,sy=0,sxx=0,sxy=0;
  for(let i=0;i<n;i++){sx+=xs[i];sy+=ys[i];sxx+=xs[i]*xs[i];sxy+=xs[i]*ys[i];}
  const den=n*sxx-sx*sx; if(Math.abs(den)<1e-9) return null; const a=(n*sxy-sx*sy)/den; return {a,b:(sy-a*sx)/n}; }
// fit minimi quadrati per la calibrazione manuale (pochi punti noti, min 2)
function linfitN(xs,ys){ const n=xs.length; if(n<2) return null; let sx=0,sy=0,sxx=0,sxy=0;
  for(let i=0;i<n;i++){sx+=xs[i];sy+=ys[i];sxx+=xs[i]*xs[i];sxy+=xs[i]*ys[i];}
  const den=n*sxx-sx*sx; if(Math.abs(den)<1e-9) return null; const a=(n*sxy-sx*sy)/den; return {a,b:(sy-a*sx)/n}; }
async function readBand(url, bnds, epsgRef){
  const tif=await GeoTIFF.fromUrl(url); const img=await tif.getImage();
  const gk=img.getGeoKeys(); const epsg=gk.ProjectedCSTypeGeoKey||epsgRef; const zone=epsg-32600;
  if(!proj4.defs['EPSG:'+epsg]) proj4.defs('EPSG:'+epsg,'+proj=utm +zone='+zone+' +ellps=WGS84 +datum=WGS84 +units=m +no_defs');
  const [ox,oy]=img.getOrigin(); const res=img.getResolution(), rx=res[0], ry=res[1];
  const toU=proj4('EPSG:4326','EPSG:'+epsg);
  const c=[toU.forward([bnds.getWest(),bnds.getSouth()]),toU.forward([bnds.getWest(),bnds.getNorth()]),toU.forward([bnds.getEast(),bnds.getSouth()]),toU.forward([bnds.getEast(),bnds.getNorth()])];
  const xs=c.map(p=>p[0]),ys=c.map(p=>p[1]); const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
  let c0=Math.floor((minx-ox)/rx), c1=Math.ceil((maxx-ox)/rx), r0=Math.floor((maxy-oy)/ry), r1=Math.ceil((miny-oy)/ry);
  c0=Math.max(0,c0); c1=Math.min(img.getWidth(),c1); r0=Math.max(0,r0); r1=Math.min(img.getHeight(),r1);
  const OUT=280;
  const d=await img.readRasters({window:[c0,r0,c1,r1],width:OUT,height:OUT,samples:[0]});
  return {data:d[0], w:OUT, h:OUT, epsg};
}
// Legge B02/B03/B08 di una scena e calcola il pSDB (Stumpf) sui pixel d'acqua (maschera NDWI)
async function readPSDB(feature, bnds){
  const a=feature.assets;
  const B=await readBand((a.blue||a.B02).href,bnds), G=await readBand((a.green||a.B03).href,bnds,B.epsg), N=await readBand((a.nir||a.B08).href,bnds,B.epsg);
  const W=B.w,H=B.h, blue=B.data,green=G.data,nir=N.data, ps=new Float32Array(W*H).fill(NaN); let nw=0;
  for(let i=0;i<W*H;i++){ const bl=blue[i],gr=green[i],ni=nir[i]; if(bl<=0||gr<=0) continue;
    if((gr-ni)/(gr+ni+1e-6)<0.02 || ni>1200) continue;   // maschera acqua (NDWI + NIR)
    const p=Math.log(1000*bl)/Math.log(1000*gr); if(isFinite(p)){ ps[i]=p; nw++; } }
  return {ps,W,H,nw};
}
async function ensureScenes(bnds){
  if(sdbScenes.length) return;
  const bbox=[bnds.getWest(),bnds.getSouth(),bnds.getEast(),bnds.getNorth()];
  const sr=await fetch('https://earth-search.aws.element84.com/v1/search',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({collections:['sentinel-2-l2a'],bbox:bbox,query:{'eo:cloud_cover':{lt:20}},sortby:[{field:'properties.eo:cloud_cover',direction:'asc'}],limit:12})});
  const sj=await sr.json(); sdbScenes=sj.features||[];
  $('sdbDate').innerHTML=sdbScenes.map((f,i)=>'<option value="'+i+'">'+f.properties.datetime.slice(0,10)+' &middot; '+(f.properties['eo:cloud_cover']||0).toFixed(1)+'% nuv.</option>').join('');
  $('sdbDateRow').style.display=sdbScenes.length?'flex':'none';
}
async function loadSDB(feature){
  if(sdbBusy||!feature) return; sdbBusy=true;
  const bnds=map.getBounds(), xW=bnds.getWest(),xE=bnds.getEast(),yN=bnds.getNorth(),yS=bnds.getSouth();
  const comp=$('lSdbComp')&&$('lSdbComp').checked;
  let date=feature.properties.datetime.slice(0,10), cc=(feature.properties['eo:cloud_cover']||0).toFixed(1);
  $('info').style.display='block'; $('info').innerHTML='SDB: leggo le bande Sentinel-2 ('+date+')&hellip;';
  try{
    let ps,W,H,nw;
    if(comp && sdbScenes.length>1){   // COMPOSITO: media pSDB sulle migliori K scene senza nuvole
      const K=Math.min(3,sdbScenes.length); let acc=null,cnt=null,used=[];
      for(let s=0;s<K;s++){ $('info').innerHTML='SDB composito: scena '+(s+1)+'/'+K+'&hellip;';
        const r=await readPSDB(sdbScenes[s],bnds).catch(()=>null); if(!r||r.nw<50) continue;
        if(!acc){ W=r.W;H=r.H; acc=new Float64Array(W*H); cnt=new Uint16Array(W*H); }
        for(let i=0;i<W*H;i++) if(!isNaN(r.ps[i])){ acc[i]+=r.ps[i]; cnt[i]++; }
        used.push(sdbScenes[s].properties.datetime.slice(0,10)); }
      if(!acc) throw new Error('composito non riuscito (zoom sul mare)');
      ps=new Float32Array(W*H).fill(NaN); nw=0;
      for(let i=0;i<W*H;i++) if(cnt[i]>0){ ps[i]=acc[i]/cnt[i]; nw++; }
      date='composito '+used.length+'x ('+used[used.length-1]+'…)'; cc='—';
    } else {
      const r=await readPSDB(feature,bnds); ps=r.ps;W=r.W;H=r.H;nw=r.nw;
    }
    if(nw<50) throw new Error('poca acqua limpida (zoom sul mare)');
    $('info').innerHTML='SDB: calibro con EMODnet&hellip;';
    const eg=await emodnetGrid(bnds).catch(()=>null); let fit=null;
    if(eg){ const xs=[],ys=[]; for(let py=0;py<H;py+=2)for(let px=0;px<W;px+=2){ const p=ps[py*W+px]; if(isNaN(p))continue;
      const ed=emodAt(eg, yN-(py/(H-1))*(yN-yS), xW+(px/(W-1))*(xE-xW));
      if(ed!=null&&ed<-1&&ed>-25){ xs.push(p); ys.push(ed); } } fit=linfit(xs,ys); }
    let calibSrc = (fit&&fit.a<0)?'EMODnet ~115 m':'', nManual=0;
    // Calibrazione dal PROFILO REALE di Sabaudia (LiDAR+ecoscandaglio ISPRA/ENEA); stesso profilo tipo per il litorale sabbioso laziale. EMODnet è troppo grezzo sottocosta.
    const _sab=inSabaudia(bnds), _sandy=_sab||inLazioSandy(bnds);
    if(_sandy){ try{
      const sd=computeSeaDistance(ps,W,H,bnds); const xs=[],ys=[];
      for(let i=0;i<W*H;i+=2){ if(isNaN(ps[i])||sd.wcomp[i]!==sd.seaComp||sd.dist[i]<1) continue;
        const D=sd.dist[i]*sd.cellM; if(D>350) continue; xs.push(ps[i]); ys.push(sabaudiaRef(D)); }
      const pf=linfit(xs,ys); if(pf&&pf.a<0){ fit=pf; calibSrc=_sab?'profilo Sabaudia (ISPRA/ENEA)':'profilo tipo sabbioso (stima)'; }
    }catch(_){} }
    // Calibrazione manuale: profondità note dell'utente (carta nautica/scandaglio) -> prevale su tutto
    try{ const cp=JSON.parse(localStorage.getItem('pr_calib')||'[]'), cx=[],cy=[];
      for(const c of cp){ if(c.lat>=yS&&c.lat<=yN&&c.lng>=xW&&c.lng<=xE){
        let px=Math.round((c.lng-xW)/(xE-xW)*(W-1)), py=Math.round((yN-c.lat)/(yN-yS)*(H-1));
        px=Math.max(0,Math.min(W-1,px)); py=Math.max(0,Math.min(H-1,py)); let pv=ps[py*W+px];
        for(let r=1;r<=3&&isNaN(pv);r++)for(let dy=-r;dy<=r&&isNaN(pv);dy++)for(let dx=-r;dx<=r&&isNaN(pv);dx++){ const q=(py+dy)*W+(px+dx); if(q>=0&&q<W*H&&!isNaN(ps[q]))pv=ps[q]; }
        if(!isNaN(pv)){ cx.push(pv); cy.push(-Math.abs(c.depth)); } } }
      nManual=cx.length;
      if(cx.length>=2){ const f=linfitN(cx,cy); if(f&&f.a<0){ fit=f; calibSrc='tua calibrazione ('+cx.length+' punti)'; } }
    }catch(_){}
    const calib = !!(fit && fit.a<0);
    const depth=new Float32Array(W*H).fill(NaN);
    if(calib){ for(let i=0;i<W*H;i++) if(!isNaN(ps[i])) depth[i]=Math.min(0,fit.a*ps[i]+fit.b); }
    else { const arr=Array.from(ps).filter(v=>!isNaN(v)).sort((x,y)=>x-y); const lo=arr[(arr.length*0.03)|0],hi=arr[(arr.length*0.97)|0];
      for(let i=0;i<W*H;i++){ if(!isNaN(ps[i])){ let t=(ps[i]-lo)/(hi-lo+1e-9); t=t<0?0:(t>1?1:t); depth[i]=-t*15; } } }
    const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const ctx=cv.getContext('2d'); const im=ctx.createImageData(W,H);
    const isoLine=(z,py,px)=>{ const zr=depth[py*W+(px+1<W?px+1:px)], zd=depth[(py+1<H?py+1:py)*W+px];
      for(const t of ISO){ if((z-t)*((isNaN(zr)?z:zr)-t)<0||(z-t)*((isNaN(zd)?z:zd)-t)<0) return true; } return false; };
    for(let py=0;py<H;py++)for(let px=0;px<W;px++){ const i=py*W+px, z=depth[i]; if(isNaN(z)){ im.data[i*4+3]=0; continue; }
      let c=sdbColor(z); if(isoLine(z,py,px)) c=[255,255,255];
      im.data[i*4]=c[0]; im.data[i*4+1]=c[1]; im.data[i*4+2]=c[2]; im.data[i*4+3]=210; }
    ctx.putImageData(im,0,0); const durl=cv.toDataURL();
    if(sdbOverlay){ map.removeLayer(sdbOverlay); sdbOverlay=null; }
    if($('lSdb').checked) sdbOverlay=L.imageOverlay(durl,bnds,{opacity:$('ovSdb').value/100,attribution:'SDB &copy; Sentinel-2/Copernicus (AWS Open Data) &middot; stima'}).addTo(map);   // colore solo se richiesto
    sdbGrid={depth,W,H,bnds,calib,calibSrc,nManual};
    drawIsobaths();   // linee batimetriche (anche senza il colore)
    drawCanaloni();   // colorazione canaloni/truogoli se attiva
    try{ localStorage.setItem('pr_sdb_offline',JSON.stringify({url:durl,n:bnds.getNorth(),s:bnds.getSouth(),e:bnds.getEast(),w:bnds.getWest(),date:date,calib:!!calib})); }catch(_){}  // SDB disponibile offline
    const onlyIso=!$('lSdb').checked;
    $('info').innerHTML='<b>'+(onlyIso?'Linee batimetriche':('SDB '+(calib?'calibrata (m)':'relativa')))+'</b> '+date+(onlyIso?'':' &middot; nuvole '+cc+'%')+' &middot; '+
      '<span class="sub">'+(calib?((onlyIso?'curve di profondità in metri':'isobate -2/-5/-10/-15 m')+' &middot; tocca per la profondità'):'profondità relativa (calibrazione non riuscita)')+' &middot; stima Sentinel-2</span>';
  }catch(e){ if(restoreOfflineSDB()){ sdbBusy=false; return; } $('info').innerHTML='SDB non riuscita: '+e.message; if($('lSdb')) $('lSdb').checked=false; }
  sdbBusy=false;
}
// Ripristina l'ultima SDB salvata (senza campo, in spiaggia): mostra l'immagine + isobate già calcolate
function restoreOfflineSDB(){ try{ const s=JSON.parse(localStorage.getItem('pr_sdb_offline')||'null'); if(!s||!s.url) return false;
  if(sdbOverlay) map.removeLayer(sdbOverlay);
  sdbOverlay=L.imageOverlay(s.url,[[s.s,s.w],[s.n,s.e]],{opacity:$('ovSdb').value/100,attribution:'SDB offline (stima Sentinel-2)'}).addTo(map);
  if($('lSdb')) $('lSdb').checked=true;
  $('info').style.display='block'; $('info').innerHTML='<b>SDB da cache offline</b> '+(s.date||'')+' &middot; <span class="sub">'+(s.calib?'isobate -2/-5/-10/-15 m':'profondità relativa')+' &middot; stima Sentinel-2 (senza rete)</span>';
  return true; }catch(e){ return false; } }
$('lSdb').onchange=async()=>{ if($('lSdb').checked){
    if(sdbGrid && restoreOfflineSDB()) return;   // griglia già calcolata (es. dalle linee): mostra il colore all'istante
    $('info').style.display='block'; $('info').innerHTML='SDB: cerco le scene Sentinel-2&hellip;';
    try{ await ensureScenes(map.getBounds()); }catch(e){ if(restoreOfflineSDB()) return; }
    if(sdbScenes.length) loadSDB(sdbScenes[0]); else if(!restoreOfflineSDB()){ $('info').innerHTML='SDB: nessuna scena disponibile qui'; $('lSdb').checked=false; } }
  else { if(sdbOverlay){ map.removeLayer(sdbOverlay); sdbOverlay=null; }
    if(!$('lIso').checked && !$('lCanal').checked){ sdbGrid=null; sdbScenes=[]; if(isoOverlay){ map.removeLayer(isoOverlay); isoOverlay=null; } if(canalOverlay){ map.removeLayer(canalOverlay); canalOverlay=null; } canalPins.clearLayers(); $('sdbDateRow').style.display='none'; }
    $('info').style.display='none'; } };
$('sdbDate').onchange=()=>{ const i=+$('sdbDate').value; if(sdbScenes[i]) loadSDB(sdbScenes[i]); };
$('lSdbComp').onchange=()=>{ if($('lSdb').checked && sdbScenes.length){ const i=+($('sdbDate').value||0); loadSDB(sdbScenes[i]||sdbScenes[0]); } };

// ---- LINEE BATIMETRICHE (isobate vettoriali dalla SDB, marching squares) ----
let isoOverlay=null;
const ISO_LV=[-1,-2,-3,-4,-5,-7,-10,-15,-20];
const ISO_LV_FINE=[-0.5,-1,-1.5,-2,-2.5,-3,-4,-5,-7,-10,-15,-20];
function isoColor(L){ const t=Math.min(1,(-L)/20), r=Math.round(180-140*t), g=Math.round(245-140*t); return 'rgb('+r+','+g+',255)'; }
// Liscia la griglia (box blur separabile, ignora NaN) -> curve continue invece di quadratini
function smoothDepth(src,W,H,rad){
  const tmp=new Float32Array(W*H), out=new Float32Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ if(isNaN(src[y*W+x])){tmp[y*W+x]=NaN;continue;} let s=0,n=0;
    for(let d=-rad;d<=rad;d++){const xx=x+d; if(xx<0||xx>=W)continue; const v=src[y*W+xx]; if(!isNaN(v)){s+=v;n++;}} tmp[y*W+x]=n?s/n:NaN; }
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ if(isNaN(tmp[y*W+x])){out[y*W+x]=NaN;continue;} let s=0,n=0;
    for(let d=-rad;d<=rad;d++){const yy=y+d; if(yy<0||yy>=H)continue; const v=tmp[yy*W+x]; if(!isNaN(v)){s+=v;n++;}} out[y*W+x]=n?s/n:NaN; }
  return out; }
function drawIsobaths(){
  if(isoOverlay){ map.removeLayer(isoOverlay); isoOverlay=null; }
  if(!($('lIso')&&$('lIso').checked) || !sdbGrid) return;
  const g=sdbGrid,W=g.W,H=g.H,b=g.bnds;
  const fine=$('lIsoFine')&&$('lIsoFine').checked;
  let depth=smoothDepth(g.depth,W,H,2); depth=smoothDepth(depth,W,H,2);   // 2 passaggi -> linee lisce
  if(fine){ depth=smoothDepth(depth,W,H,3); depth=smoothDepth(depth,W,H,3); depth=smoothDepth(depth,W,H,4); }  // lisciatura extra: 0,5 m e' vicino al rumore SDB
  const CW=900,CH=Math.round(CW*H/W),cv=document.createElement('canvas'); cv.width=CW; cv.height=CH;
  const ctx=cv.getContext('2d'); ctx.font='bold 15px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const gx=x=>x/(W-1)*CW, gy=y=>y/(H-1)*CH;
  const tab={1:[['B','L']],2:[['R','B']],3:[['R','L']],4:[['T','R']],5:[['T','R'],['B','L']],6:[['T','B']],7:[['T','L']],8:[['T','L']],9:[['T','B']],10:[['T','L'],['R','B']],11:[['T','R']],12:[['L','R']],13:[['R','B']],14:[['B','L']]};
  const levels=fine?ISO_LV_FINE:ISO_LV;
  for(const L of levels){ const segs=[];
    for(let y=0;y<H-1;y++) for(let x=0;x<W-1;x++){
      const a=depth[y*W+x],bb=depth[y*W+x+1],c=depth[(y+1)*W+x+1],d=depth[(y+1)*W+x];
      if(isNaN(a)||isNaN(bb)||isNaN(c)||isNaN(d)) continue;
      let idx=0; if(a>L)idx|=8; if(bb>L)idx|=4; if(c>L)idx|=2; if(d>L)idx|=1;
      if(idx===0||idx===15) continue;
      const E={T:[x+(L-a)/(bb-a),y],R:[x+1,y+(L-bb)/(c-bb)],B:[x+(L-d)/(c-d),y+1],L:[x,y+(L-a)/(d-a)]};
      for(const pq of (tab[idx]||[])) segs.push([E[pq[0]],E[pq[1]]]); }
    if(!segs.length) continue;
    ctx.beginPath();
    for(const s of segs){ ctx.moveTo(gx(s[0][0]),gy(s[0][1])); ctx.lineTo(gx(s[1][0]),gy(s[1][1])); }
    ctx.lineWidth=3.8; ctx.strokeStyle='rgba(3,8,16,.8)'; ctx.stroke();   // alone scuro per leggibilità sul satellite
    ctx.lineWidth=1.8; ctx.strokeStyle=isoColor(L); ctx.stroke();          // linea colorata
    const step=Math.max(35,(segs.length/4)|0);
    for(let k=0;k<segs.length;k+=step){ const s=segs[k],mx=gx((s[0][0]+s[1][0])/2),my=gy((s[0][1]+s[1][1])/2);
      ctx.lineWidth=3; ctx.strokeStyle='rgba(4,10,20,.9)'; ctx.strokeText(Math.abs(L)+'m',mx,my);
      ctx.fillStyle=isoColor(L); ctx.fillText(Math.abs(L)+'m',mx,my); } }
  isoOverlay=L.imageOverlay(cv.toDataURL(),b,{opacity:0.95,interactive:false}).addTo(map);
}
$('lIso').onchange=async()=>{
  if(!$('lIso').checked){ drawIsobaths(); return; }   // spegne le linee
  if(sdbGrid){ drawIsobaths(); return; }              // griglia già pronta
  // calcola la griglia SDB per disegnare SOLO le linee (senza il colore)
  $('info').style.display='block'; $('info').innerHTML='Calcolo le linee batimetriche&hellip;';
  try{ await ensureScenes(map.getBounds()); }catch(e){ if(restoreOfflineSDB()){ return; } }
  if(sdbScenes.length) loadSDB(sdbScenes[+($('sdbDate').value||0)]||sdbScenes[0]);
  else { $('info').innerHTML='Nessuna scena satellitare qui per le linee'; $('lIso').checked=false; }
};
$('lIsoFine').onchange=()=>{ if($('lIsoFine').checked && !$('lIso').checked){ $('lIso').checked=true; $('lIso').onchange(); return; } drawIsobaths(); };

// ---- CANALONI: rilievo = profondità locale - tendenza regionale; colora a fasce truogoli(deeper)/barre(shallower) ----
let canalOverlay=null; const canalPins=L.layerGroup().addTo(map);
// ---- RICONOSCIMENTO PORTI (OpenStreetMap Overpass): i punti dentro un porto/marina NON sono di pesca -> esclusi ----
let harborPolys=[], harborFetched={}, _lastCanal=null, _seaCache=null; const harborLayer=L.layerGroup().addTo(map);
function pointInPoly(lat,lng,poly){ let inside=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){ const yi=poly[i][0],xi=poly[i][1],yj=poly[j][0],xj=poly[j][1];
  if(((yi>lat)!==(yj>lat)) && (lng < (xj-xi)*(lat-yi)/((yj-yi)||1e-12)+xi)) inside=!inside; } return inside; }
function inHarbor(lat,lng){ for(const poly of harborPolys) if(pointInPoly(lat,lng,poly)) return true; return false; }
function addHarborPolys(polys){ for(const poly of (polys||[])){ if(!poly||poly.length<3) continue; harborPolys.push(poly);
  L.polygon(poly,{color:'#ff9028',weight:1.4,fillColor:'#ff9028',fillOpacity:0.10,dashArray:'5,4',interactive:false}).addTo(harborLayer); } }
async function ensureHarbors(b){
  const key=[b.getSouth().toFixed(2),b.getWest().toFixed(2),b.getNorth().toFixed(2),b.getEast().toFixed(2)].join(',');
  if(harborFetched[key]) return false;
  try{ const cached=JSON.parse(localStorage.getItem('pr_harbors_'+key)||'null'); if(cached){ harborFetched[key]=true; addHarborPolys(cached); return cached.length>0; } }catch(_){}
  const d=0.02,s=b.getSouth()-d,w=b.getWest()-d,n=b.getNorth()+d,e=b.getEast()+d, bb=s+','+w+','+n+','+e;
  const q='[out:json][timeout:15];(way["leisure"="marina"]('+bb+');relation["leisure"="marina"]('+bb+');way["harbour"]('+bb+');way["landuse"="harbour"]('+bb+');way["waterway"="dock"]('+bb+'););out geom;';
  try{ const r=await fetchTO('https://overpass-api.de/api/interpreter',20000,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'}});
    if(!r.ok) return false; const j=await r.json(); const polys=[];   // solo un fetch COMPLETATO marca l'area 'fatta': i fallimenti transitori (rete/504/timeout) ritentano
    for(const el of (j.elements||[])){ if(el.geometry&&el.geometry.length>=3) polys.push(el.geometry.map(p=>[p.lat,p.lon]));
      else if(el.members) for(const m of el.members){ if(m.geometry&&m.geometry.length>=3) polys.push(m.geometry.map(p=>[p.lat,p.lon])); } }
    harborFetched[key]=true;
    if(polys.length){ addHarborPolys(polys); try{ localStorage.setItem('pr_harbors_'+key,JSON.stringify(polys)); }catch(_){} }
    return polys.length>0;
  }catch(_){ return false; }
}
// ---- ZONE PORTO MANUALI (100% affidabili, salvate in locale): dove OSM non mappa il porto, l'utente lo esclude a mano ----
let noPorts=[]; try{ noPorts=JSON.parse(localStorage.getItem('pr_noports')||'[]'); }catch(_){ noPorts=[]; }
let noPortR=Math.min(500,Math.max(40,+(localStorage.getItem('pr_noport_r')||130)));   // raggio predefinito (ultimo usato)
const noPortLayer=L.layerGroup().addTo(map); let noPortCircles=[];
function inNoFish(lat,lng){ if(inHarbor(lat,lng)) return true; for(const z of noPorts){ if(map.distance([lat,lng],[z.lat,z.lng])<=z.r) return true; } return false; }
function renderNoPorts(){ noPortLayer.clearLayers(); noPortCircles=[]; noPorts.forEach((z,i)=>{
  const circ=L.circle([z.lat,z.lng],{radius:z.r,color:'#ff4d4d',weight:1.4,fillColor:'#ff4d4d',fillOpacity:0.12,dashArray:'4,4'}).addTo(noPortLayer);
  circ.bindPopup('&#128683; <b>Zona porto</b> &mdash; esclusa dai punti di pesca'+
    '<br><div style="display:flex;align-items:center;gap:6px;margin:7px 0 4px"><span class="sub">Raggio</span>'+
    '<input type="range" min="40" max="500" step="10" value="'+z.r+'" oninput="prSetPortR('+i+',this.value)" onchange="prCommitPort()" style="flex:1;accent-color:#ff6b6b">'+
    '<b id="prR'+i+'" style="color:#ff9bb0;min-width:48px;text-align:right">'+z.r+'&nbsp;m</b></div>'+
    '<a href="#" style="color:#ff9bb0" onclick="prDelPort('+i+');return false">rimuovi zona</a>');
  noPortCircles.push(circ); }); }
function refilterCanaloni(){ if(_lastCanal && $('lCanal') && $('lCanal').checked) markCanalMouths(_lastCanal.res,_lastCanal.dp,_lastCanal.W,_lastCanal.H,_lastCanal.b); }
// Regolazione del raggio dal vivo: aggiorna cerchio + salva; i punti di pesca si rifiltrano al rilascio (prCommitPort)
window.prSetPortR=function(i,r){ r=+r; if(!noPorts[i]) return; noPorts[i].r=r; noPortR=r;
  if(noPortCircles[i]) noPortCircles[i].setRadius(r); const lab=document.getElementById('prR'+i); if(lab) lab.innerHTML=r+'&nbsp;m'; };   // live: solo cerchio+etichetta (niente scritture per tick)
window.prCommitPort=function(){ localStorage.setItem('pr_noports',JSON.stringify(noPorts)); localStorage.setItem('pr_noport_r',noPortR); refilterCanaloni(); };   // al rilascio: salva + rifiltra
window.prAddPort=function(lat,lng){ noPorts.push({lat:+lat,lng:+lng,r:noPortR}); localStorage.setItem('pr_noports',JSON.stringify(noPorts)); map.closePopup(); renderNoPorts(); refilterCanaloni();
  $('info').style.display='block'; $('info').innerHTML='&#128683; <b>Zona porto esclusa</b> &middot; i punti di pesca qui vengono rimossi.<br><span class="sub">tocca la zona rossa per regolare il <b>raggio</b> o rimuoverla</span>'; setTimeout(()=>$('info').style.display='none',5000); };
window.prDelPort=function(i){ noPorts.splice(i,1); localStorage.setItem('pr_noports',JSON.stringify(noPorts)); map.closePopup(); renderNoPorts(); refilterCanaloni(); };
renderNoPorts();
const canalIcon=L.divIcon({className:'',html:'<div class="canalpin">&#127744;</div>',iconSize:[26,26],iconAnchor:[13,13]});          // esterno (viola)
const canalIconNear=L.divIcon({className:'',html:'<div class="canalpin near">&#127907;</div>',iconSize:[26,26],iconAnchor:[13,13]});  // sotto riva, a portata di lancio (verde)
function drawCanaloni(){
  if(canalOverlay){ map.removeLayer(canalOverlay); canalOverlay=null; } canalPins.clearLayers();
  if(!($('lCanal')&&$('lCanal').checked) || !sdbGrid){ updLegend(); return; }
  const g=sdbGrid,W=g.W,H=g.H,dp=g.depth,b=g.bnds;
  let d=smoothDepth(dp,W,H,3); d=smoothDepth(d,W,H,3);       // togli il rumore fine (fasce pulite)
  const rad=Math.max(12,Math.round(W/10));                  // scala regionale (rimuove barre/canali)
  let trend=smoothDepth(d,W,H,rad); trend=smoothDepth(trend,W,H,rad);
  const res=new Float32Array(W*H).fill(NaN);
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const ctx=cv.getContext('2d'); const im=ctx.createImageData(W,H);
  for(let i=0;i<W*H;i++){ if(isNaN(dp[i])||isNaN(d[i])||isNaN(trend[i])){ im.data[i*4+3]=0; continue; }
    const r=d[i]-trend[i]; res[i]=r; let c=null,al=0;       // r<0 = più profondo del contorno = canalone/truogolo
    if(r<=-1.2){ c=[126,66,224]; al=170; }                  // canalone marcato (buca)
    else if(r<=-0.6){ c=[46,116,240]; al=150; }             // canalone
    else if(r<=-0.28){ c=[86,200,240]; al=120; }            // truogolo lieve
    else if(r>=0.5){ c=[232,196,120]; al=70; }              // barra/secca (tenue)
    else { im.data[i*4+3]=0; continue; }
    im.data[i*4]=c[0]; im.data[i*4+1]=c[1]; im.data[i*4+2]=c[2]; im.data[i*4+3]=al; }
  ctx.putImageData(im,0,0);
  canalOverlay=L.imageOverlay(cv.toDataURL(),b,{opacity:0.8,interactive:false}).addTo(map);
  _lastCanal={res,dp,W,H,b};
  markCanalMouths(res,dp,W,H,b);
  updLegend();
  // riconosci i porti nell'area e, appena noti, rifiltra i canaloni (escludendo quelli nel porto)
  ensureHarbors(b).then(added=>{ if(added && $('lCanal')&&$('lCanal').checked && _lastCanal){ markCanalMouths(_lastCanal.res,_lastCanal.dp,_lastCanal.W,_lastCanal.H,_lastCanal.b); } }).catch(()=>{});   // rifiltra solo se sono comparsi porti nuovi
}
// Marca i canaloni per DISTANZA DALLA RIVA: "sotto riva" (a portata di lancio, <=140 m) vs "esterni".
// Distanza calcolata dalla sola TERRAFERMA (componente NaN più grande), ignorando i falsi NaN in acqua.
const CAST_M=140;   // portata tipica del lancio da riva
// Profilo batimetrico di riferimento del litorale di Sabaudia (dati LiDAR+ecoscandaglio ISPRA/ENEA, Taramelli et al. 2020):
// fondale dolcissimo, barre entro -5 m fino a ~200 m, poi verso la profondità di chiusura ~ -7,5/-8 m.
function sabaudiaRef(D){ if(D<=0) return 0; if(D<=200) return -(D/200)*5; return -Math.min(8, 5+(D-200)*2.5/200); }
function inSabaudia(b){ const la=(b.getNorth()+b.getSouth())/2, lo=(b.getWest()+b.getEast())/2; return la>41.15&&la<41.45&&lo>12.85&&lo<13.10; }
// Litorale sabbioso laziale (Ostia->Terracina): profilo tipo (stima); esclude le coste rocciose tipo Ischia (lon>13.5)
function inLazioSandy(b){ const la=(b.getNorth()+b.getSouth())/2, lo=(b.getWest()+b.getEast())/2; return la>40.9&&la<41.95&&lo>11.9&&lo<13.5; }
// Distanza dal mare (celle) + cellM + componenti acqua/mare. Usa la maschera NaN come "terra", con apertura morfologica per togliere la schiuma/surf.
function computeSeaDistance(depth,W,H,b){
  const N=b.getNorth(),S=b.getSouth(),Wd=b.getWest(),E=b.getEast(), midLat=(N+S)/2;
  const cellM=((E-Wd)*111320*Math.cos(midLat*Math.PI/180))/(W-1);
  const land=new Uint8Array(W*H); for(let i=0;i<W*H;i++) land[i]=isNaN(depth[i])?1:0;
  const rr=4, er=new Uint8Array(W*H);
  for(let py=0;py<H;py++)for(let px=0;px<W;px++){ let all=1;
    for(let dy=-rr;dy<=rr&&all;dy++){ const yy=py+dy; if(yy<0||yy>=H)continue; const row=yy*W;
      for(let dx=-rr;dx<=rr;dx++){ const xx=px+dx; if(xx<0||xx>=W)continue; if(!land[row+xx]){ all=0; break; } } }
    er[py*W+px]=all; }
  const op=new Uint8Array(W*H);
  for(let py=0;py<H;py++)for(let px=0;px<W;px++){ let any=0;
    for(let dy=-rr;dy<=rr&&!any;dy++){ const yy=py+dy; if(yy<0||yy>=H)continue; const row=yy*W;
      for(let dx=-rr;dx<=rr;dx++){ const xx=px+dx; if(xx<0||xx>=W)continue; if(er[row+xx]){ any=1; break; } } }
    op[py*W+px]=any; }
  const dist=new Int32Array(W*H).fill(-1), q=[];
  for(let i=0;i<W*H;i++) if(op[i]){ dist[i]=0; q.push(i); }
  for(let h=0;h<q.length;h++){ const i=q[h], py=(i/W)|0, px=i-py*W, dn=dist[i]+1;
    if(px>0&&dist[i-1]<0){dist[i-1]=dn;q.push(i-1);} if(px<W-1&&dist[i+1]<0){dist[i+1]=dn;q.push(i+1);}
    if(py>0&&dist[i-W]<0){dist[i-W]=dn;q.push(i-W);} if(py<H-1&&dist[i+W]<0){dist[i+W]=dn;q.push(i+W);} }
  const wcomp=new Int32Array(W*H).fill(-1); let wnc=0, seaComp=-1, seaSz=0; const wst=[];
  for(let s=0;s<W*H;s++){ if(op[s]||wcomp[s]>=0) continue; let sz=0, border=false; wst.length=0; wst.push(s); wcomp[s]=wnc;
    while(wst.length){ const i=wst.pop(), py=(i/W)|0, px=i-py*W; sz++; if(px===0||py===0||px===W-1||py===H-1) border=true;
      if(px>0&&!op[i-1]&&wcomp[i-1]<0){wcomp[i-1]=wnc;wst.push(i-1);}
      if(px<W-1&&!op[i+1]&&wcomp[i+1]<0){wcomp[i+1]=wnc;wst.push(i+1);}
      if(py>0&&!op[i-W]&&wcomp[i-W]<0){wcomp[i-W]=wnc;wst.push(i-W);}
      if(py<H-1&&!op[i+W]&&wcomp[i+W]<0){wcomp[i+W]=wnc;wst.push(i+W);} }
    if(border && sz>seaSz){ seaSz=sz; seaComp=wnc; } wnc++; }
  return {dist,cellM,wcomp,seaComp};
}
function markCanalMouths(res,depth,W,H,b){
  canalPins.clearLayers();   // FIX: evita pin duplicati quando si rifiltra (porti OSM / zone manuali)
  const N=b.getNorth(),S=b.getSouth(),Wd=b.getWest(),E=b.getEast();
  let sd; if(_seaCache && _seaCache.depth===depth) sd=_seaCache.val; else { sd=computeSeaDistance(depth,W,H,b); _seaCache={depth,val:sd}; }   // memoizza il BFS (dipende solo dalla griglia, non dai porti)
  const {dist,cellM,wcomp,seaComp}=sd;
  // nuclei dei canali = minimi locali del rilievo
  const R=10, cand=[];
  for(let py=2;py<H-2;py++)for(let px=2;px<W-2;px++){ const i=py*W+px, r=res[i];
    if(isNaN(r)||r>-0.18||!isFinite(depth[i])||dist[i]<1||wcomp[i]!==seaComp) continue;
    if(harborPolys.length||noPorts.length){ const _la=N-(py/(H-1))*(N-S), _lo=Wd+(px/(W-1))*(E-Wd); if(inNoFish(_la,_lo)) continue; }   // dentro un porto: non pescabile
    let isMin=true;
    for(let dy=-R;dy<=R&&isMin;dy++){ const yy=py+dy; if(yy<0||yy>=H)continue; const row=yy*W;
      for(let dx=-R;dx<=R;dx++){ const xx=px+dx; if(xx<0||xx>=W)continue; const rj=res[row+xx]; if(!isNaN(rj)&&rj<r){ isMin=false; break; } } }
    if(isMin) cand.push({i,r,dep:depth[i],dm:dist[i]*cellM}); }
  const near=cand.filter(c=>c.dm<=CAST_M).sort((a,c)=>a.dm-c.dm).slice(0,10);   // a portata di lancio, più vicini prima
  const far =cand.filter(c=>c.dm>CAST_M).sort((a,c)=>a.r-c.r).slice(0,3);        // esterni
  near.forEach(c=>c.near=true); far.forEach(c=>c.near=false);
  [...near,...far].forEach(cp=>{ const py=(cp.i/W)|0, px=cp.i-py*W, lat=N-(py/(H-1))*(N-S), lng=Wd+(px/(W-1))*(E-Wd);
    rulerSnappable(L.marker([lat,lng],{icon: cp.near?canalIconNear:canalIcon}).addTo(canalPins)
     .bindPopup((cp.near?'&#127907;':'&#127744;')+' <b>Canalone '+(cp.near?'sotto riva':'esterno')+'</b><br><span class="sub">~'+Math.abs(cp.dep).toFixed(1)+' m &middot; ~'+Math.round(cp.dm)+' m dalla riva'+(cp.near?' &middot; a portata di lancio':'')+'<br>&#128207; col righello attivo, tocca qui per agganciare B</span><br><button class="prDelBtn" style="border-color:#ff4d4d;color:#ffb3b3;background:#2a1414" onclick="prAddPort('+lat+','+lng+')">&#128683; qui &egrave; un porto (escludi)</button>')); });
}
$('lCanal').onchange=async()=>{
  if(!$('lCanal').checked){ drawCanaloni(); return; }
  if(sdbGrid){ drawCanaloni(); return; }
  $('info').style.display='block'; $('info').innerHTML='Cerco i canaloni&hellip;';
  try{ await ensureScenes(map.getBounds()); }catch(e){ if(restoreOfflineSDB()){ return; } }
  if(sdbScenes.length) loadSDB(sdbScenes[+($('sdbDate').value||0)]||sdbScenes[0]);
  else { $('info').innerHTML='Nessuna scena satellitare qui'; $('lCanal').checked=false; }
};

// La SDB (Prof.) segue la parte visibile: allo spostamento/zoom si ricalcola per la nuova area
let sdbMoveT=null;
function coverFrac(v,g){ const iw=Math.max(0,Math.min(v.getEast(),g.getEast())-Math.max(v.getWest(),g.getWest())),
  ih=Math.max(0,Math.min(v.getNorth(),g.getNorth())-Math.max(v.getSouth(),g.getSouth())),
  va=(v.getEast()-v.getWest())*(v.getNorth()-v.getSouth()); return va>0?(iw*ih)/va:0; }
map.on('moveend', ()=>{ if(!$('lSdb').checked && !$('lIso').checked && !$('lCanal').checked) return; clearTimeout(sdbMoveT);
  sdbMoveT=setTimeout(async ()=>{ if(sdbBusy||(!$('lSdb').checked && !$('lIso').checked && !$('lCanal').checked)) return;
    if(map.getZoom()<12) return;                                   // troppo largo: SDB non ha senso
    const v=map.getBounds();
    if(sdbGrid){ const gb=sdbGrid.bnds;
      const gA=(gb.getEast()-gb.getWest())*(gb.getNorth()-gb.getSouth());
      const vA=(v.getEast()-v.getWest())*(v.getNorth()-v.getSouth());
      if(coverFrac(v,gb)>0.7 && vA/gA>0.45) return;                // coperto E risoluzione adeguata: niente ricarico
    }                                                              // altrimenti (spostato o zoomato dentro) ricalcola a piena risoluzione
    sdbScenes=[]; try{ await ensureScenes(v); }catch(e){ return; } // nuove scene per l'area visibile
    if(sdbScenes.length){ const i=+($('sdbDate').value||0); loadSDB(sdbScenes[Math.min(i,sdbScenes.length-1)]||sdbScenes[0]); }
  }, 900); });

// ================= SELETTORE LOCALITÀ =================
const PLACES=[{n:'A9 (il mio spot)',lat:41.35002,lng:12.96553,z:16},{n:'Sabaudia',lat:41.2668,lng:13.0265,z:15},{n:'Ostia',lat:41.7250,lng:12.2750,z:14},
  {n:'Circeo (San Felice)',lat:41.2350,lng:13.0850,z:14},{n:'Anzio / Nettuno',lat:41.4400,lng:12.6300,z:14},
  {n:'Forio (Ischia)',lat:40.7350,lng:13.8550,z:14},{n:'Terracina',lat:41.2850,lng:13.2400,z:14}];
function customPlaces(){ try{ return JSON.parse(localStorage.getItem('pr_places')||'[]'); }catch(e){ return []; } }
function populatePlaces(){ const cp=customPlaces();
  $('place').innerHTML='<option value="">&mdash; Vai a una localit&agrave;&hellip; &mdash;</option>'+
    PLACES.map((p,i)=>'<option value="p'+i+'">&#128205; '+p.n+'</option>').join('')+
    (cp.length?('<optgroup label="Le mie localit&agrave;">'+cp.map((p,i)=>'<option value="c'+i+'">&#11088; '+p.n+'</option>').join('')+'</optgroup>'):''); }
$('place').onchange=()=>{ const v=$('place').value; if(!v) return; let p; if(v[0]==='p') p=PLACES[+v.slice(1)]; else p=customPlaces()[+v.slice(1)];
  if(p){ if(sdbOverlay){ map.removeLayer(sdbOverlay); sdbOverlay=null; sdbGrid=null; sdbScenes=[]; if($('lSdb'))$('lSdb').checked=false; $('sdbDateRow').style.display='none'; }
    map.setView([p.lat,p.lng],p.z||14); } $('place').value=''; };
$('btnAddPlace').onclick=()=>{ const nm=prompt('Nome della località (es. "Spot pennello nord"):'); if(!nm) return;
  const c=map.getCenter(), cp=customPlaces(); cp.push({n:nm.trim().slice(0,40),lat:c.lat,lng:c.lng,z:map.getZoom()});
  localStorage.setItem('pr_places',JSON.stringify(cp)); populatePlaces();
  $('info').style.display='block'; $('info').innerHTML='&#11088; Localit&agrave; "<b>'+esc(nm)+'</b>" salvata';
  if(typeof preloadAll==='function' && navigator.onLine) setTimeout(preloadAll,600); else setTimeout(()=>$('info').style.display='none',2500); };
populatePlaces();

// ================= CALIBRAZIONE PROFONDITÀ (punti noti dalla carta nautica / scandaglio) =================
let calibrating=false, calibLayer=L.layerGroup().addTo(map);
function calibPts(){ try{ return JSON.parse(localStorage.getItem('pr_calib')||'[]'); }catch(e){ return []; } }
function renderCalib(){ calibLayer.clearLayers(); calibPts().forEach((c,i)=>{
  L.circleMarker([c.lat,c.lng],{radius:6,color:'#0a2b00',fillColor:'#8dff3a',fillOpacity:1,weight:2}).addTo(calibLayer)
   .bindPopup('&#127919; Punto noto: <b>'+Math.abs(c.depth)+' m</b><br><a href="#" onclick="prDelCalib('+i+');return false">elimina</a>'); }); }
window.prDelCalib=function(i){ const cp=calibPts(); cp.splice(i,1); localStorage.setItem('pr_calib',JSON.stringify(cp)); map.closePopup(); renderCalib();
  if(sdbScenes.length){ const j=+($('sdbDate').value||0); loadSDB(sdbScenes[j]||sdbScenes[0]); } };
function addCalibPoint(ll){ const s=prompt('Profondità REALE di questo punto in metri\n(dalla carta nautica o dallo scandaglio):'); if(s==null) return;
  const d=parseFloat(String(s).replace(',','.')); if(!isFinite(d)||d<=0){ alert('Inserisci un numero di metri, es. 4.5'); return; }
  const cp=calibPts(); cp.push({lat:ll.lat,lng:ll.lng,depth:d}); localStorage.setItem('pr_calib',JSON.stringify(cp)); renderCalib();
  const n=cp.length; $('info').style.display='block';
  $('info').innerHTML='&#127919; Punto noto salvato ('+n+'). '+(n>=2?'Ricalcolo la profondit&agrave;&hellip;':'Servono almeno <b>2</b> punti per calibrare in metri.');
  if(n>=2 && sdbScenes.length){ const j=+($('sdbDate').value||0); loadSDB(sdbScenes[j]||sdbScenes[0]); } else setTimeout(()=>$('info').style.display='none',4000); }
$('btnCalib').onclick=()=>{ calibrating=!calibrating; $('btnCalib').classList.toggle('active',calibrating);
  if(calibrating){ if(marking){ marking=false; if($('btnMark'))$('btnMark').classList.remove('active'); } if($('lRuler').checked)$('lRuler').checked=false;
    $('info').style.display='block'; $('info').innerHTML='<b>&#127919; Calibrazione</b>: tocca un punto di cui <b>conosci la profondit&agrave;</b> e inseriscila.<br><span class="sub">servono almeno 2 punti &middot; migliora i metri assoluti della SDB</span>'; }
  else $('info').style.display='none'; };
renderCalib();

// ================= PUNTI / CATTURE (marker con coordinate + specie, info del momento in automatico) =================
let marks=[]; try{ marks=JSON.parse(localStorage.getItem('pr_marks')||'[]'); }catch(e){ marks=[]; }
let marking=false, pendingAuto=null;
const markLayer=L.layerGroup().addTo(map);
function markIcon(cat){ return L.divIcon({className:'',html:'<div class="prpin">'+(cat?'&#128031;':'&#128205;')+'</div>',iconSize:[22,22],iconAnchor:[11,20],popupAnchor:[0,-18]}); }
function fmtDepth(d){ return d==null?'—':(d>=0?('terra +'+Math.round(d)+' m'):(Math.abs(Math.round(d))+' m')); }
function popupHtml(m,idx){
  const when=m.time?new Date(m.time).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
  let h='';
  if(m.specie) h+='<b>'+esc(m.specie)+'</b>'+(m.peso?(' &middot; '+esc(m.peso)):'')+'<br>'; else h+='<b>Punto</b><br>';
  if(m.note) h+='<i>'+esc(m.note)+'</i><br>';
  h+='<span style="color:#8fb0cc;font-size:11px">'+when+'<br>'+m.lat.toFixed(5)+', '+m.lng.toFixed(5)+
     '<br>prof: '+fmtDepth(m.depth)+(m.fondale?(' &middot; fondale: '+esc(m.fondale)):'')+'</span>'+
     '<br><button class="prDelBtn" onclick="prDelMark('+idx+')">Elimina</button>';
  return h;
}
function renderMarks(){ markLayer.clearLayers(); if(!$('lMarks').checked) return;
  marks.forEach((m,idx)=>{ rulerSnappable(L.marker([m.lat,m.lng],{icon:markIcon(!!m.specie)}).addTo(markLayer).bindPopup(popupHtml(m,idx))); });
}
window.prDelMark=function(idx){ marks.splice(idx,1); localStorage.setItem('pr_marks',JSON.stringify(marks)); map.closePopup(); renderMarks(); };
async function openMarkForm(ll){
  const now=new Date();
  pendingAuto={time:now.toISOString(), lat:ll.lat, lng:ll.lng, depth:null, fondale:null};
  $('mfSpecie').value=''; $('mfPeso').value=''; $('mfNote').value='';
  $('mfAuto').innerHTML='<b>In automatico:</b> '+now.toLocaleString('it-IT')+'<br>'+ll.lat.toFixed(5)+', '+ll.lng.toFixed(5)+'<br>profondità e fondale&hellip;';
  $('markForm').style.display='block';
  // profondità: prima dalla SDB (se caricata e nel riquadro), poi EMODnet
  let dep=null;
  if(sdbGrid){ const g=sdbGrid,b=g.bnds; if(ll.lat<=b.getNorth()&&ll.lat>=b.getSouth()&&ll.lng>=b.getWest()&&ll.lng<=b.getEast()){
    const px=Math.round((ll.lng-b.getWest())/(b.getEast()-b.getWest())*(g.W-1)), py=Math.round((b.getNorth()-ll.lat)/(b.getNorth()-b.getSouth())*(g.H-1));
    const z=g.depth[py*g.W+px]; if(isFinite(z)) dep=z; } }
  if(dep==null) dep=await depthAt(ll.lat,ll.lng).catch(()=>null);
  const hab=await habitatAt(ll.lat,ll.lng).catch(()=>null);
  pendingAuto.depth=dep; pendingAuto.fondale=hab;
  $('mfAuto').innerHTML='<b>In automatico:</b> '+now.toLocaleString('it-IT')+'<br>'+ll.lat.toFixed(5)+', '+ll.lng.toFixed(5)+
    '<br>profondità: '+fmtDepth(dep)+' &middot; fondale: '+(hab||'—')+
    (inNoFish(ll.lat,ll.lng)?'<br><b style="color:#ffb020">&#9888; dentro un porto</b> &mdash; di norma non pescabile':'<span id="mfPort"></span>');
  // FIX: non bloccare la UI sull'await Overpass (profondità/fondale sono già pronti); aggiorna il badge porto quando/se i porti sono noti
  ensureHarbors(map.getBounds()).then(()=>{ const e=$('mfPort'); if(e && inNoFish(ll.lat,ll.lng)) e.innerHTML='<br><b style="color:#ffb020">&#9888; dentro un porto</b> &mdash; di norma non pescabile'; }).catch(()=>{});
}
function closeMark(){ $('markForm').style.display='none'; marking=false; $('btnMark').classList.remove('active'); map.getContainer().style.cursor=''; }
$('mfSave').onclick=()=>{ if(!pendingAuto) return;
  marks.push(Object.assign({},pendingAuto,{specie:$('mfSpecie').value.trim(),peso:$('mfPeso').value.trim(),note:$('mfNote').value.trim()}));
  localStorage.setItem('pr_marks',JSON.stringify(marks)); $('lMarks').checked=true; renderMarks(); closeMark(); };
$('mfCancel').onclick=closeMark; $('mfClose').onclick=closeMark;
$('btnMark').onclick=()=>{ marking=!marking; $('btnMark').classList.toggle('active',marking);
  map.getContainer().style.cursor=marking?'crosshair':'';
  $('info').style.display='block'; $('info').innerHTML=marking?'<b>Segna punto</b>: tocca sulla mappa dove hai pescato/catturato':''; if(!marking)$('info').style.display='none'; };
$('lMarks').onchange=renderMarks;
renderMarks();

// ---- Helper offline: elenco tessere satellitari per un riquadro e range di zoom + download in cache ----
function tilesForBounds(b, zmin, zmax){ const rad=v=>v*Math.PI/180, urls=[];
  for(let Z=zmin; Z<=zmax; Z++){ const n=Math.pow(2,Z);
    const x0=Math.floor((b.getWest()+180)/360*n), x1=Math.floor((b.getEast()+180)/360*n);
    const y0=Math.floor((1-Math.log(Math.tan(rad(b.getNorth()))+1/Math.cos(rad(b.getNorth())))/Math.PI)/2*n);
    const y1=Math.floor((1-Math.log(Math.tan(rad(b.getSouth()))+1/Math.cos(rad(b.getSouth())))/Math.PI)/2*n);
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++) urls.push('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/'+Z+'/'+y+'/'+x); }
  return urls; }
async function cacheTiles(urls, onProg){ const cache=await caches.open('fishcast-tiles'); let done=0;
  for(const url of urls){ try{ const r=await fetch(url,{mode:'no-cors'}); await cache.put(url,r); }catch(e){} done++;
    if(onProg&&(done%15===0||done===urls.length)) onProg(done,urls.length); } return done; }

// ---- Salva zona offline: precarica le tessere satellitari dell'area (per pescare senza campo) ----
$('btnOffline').onclick=async()=>{ if(!('caches' in window)){ $('info').style.display='block'; $('info').innerHTML='Cache offline non supportata da questo browser'; return; }
  const b=map.getBounds(), z=map.getZoom();
  const list=tilesForBounds(b,Math.max(12,z-1),Math.min(18,z+2)).slice(0,600);
  $('info').style.display='block'; $('btnOffline').disabled=true;
  await cacheTiles(list,(d,t)=>$('info').innerHTML='&#11015; Salvo la zona offline&hellip; '+d+'/'+t+' tessere');
  $('btnOffline').disabled=false;
  const hasSdb=!!localStorage.getItem('pr_sdb_offline');
  try{ localStorage.setItem('pr_offline_zone',JSON.stringify({n:b.getNorth(),s:b.getSouth(),e:b.getEast(),w:b.getWest(),z,tiles:list.length})); }catch(_){}
  $('info').innerHTML='&#9989; <b>Zona salvata offline</b>: '+list.length+' tessere'+(hasSdb?' + SDB':'')+'. Qui la mappa funziona anche senza campo.'; setTimeout(()=>$('info').style.display='none',6000); };

// ---- Preload automatico zone offline (una volta per zona, in background) ----
async function preloadZone(lat,lng,label){ const d=0.016, b=L.latLngBounds([[lat-d,lng-d],[lat+d,lng+d]]);  // ~riquadro 3.5 km
  const list=tilesForBounds(b,13,17).slice(0,500);
  $('info').style.display='block'; $('info').innerHTML='&#11015; Preparo <b>'+label+'</b> per l\'uso offline&hellip;';
  const n=await cacheTiles(list,(dn,t)=>{ $('info').innerHTML='&#11015; Preparo <b>'+label+'</b> offline&hellip; '+dn+'/'+t+' tessere'; });
  $('info').innerHTML='&#9989; <b>'+label+' pronta offline</b> ('+n+' tessere).';
  setTimeout(()=>{ if($('info').innerHTML.indexOf('pronta offline')>=0) $('info').style.display='none'; },4500); return n; }
function placeKey(p){ return p.n+'@'+(+p.lat).toFixed(4)+','+(+p.lng).toFixed(4); }
// Preload della zona A9 + di tutte le località salvate non ancora in cache
async function preloadAll(){ try{
  if(!('caches' in window) || !navigator.onLine) return;
  if(!localStorage.getItem('pr_a9_cached')){ await preloadZone(41.35002,12.96553,'A9'); localStorage.setItem('pr_a9_cached','1'); }
  let done; try{ done=JSON.parse(localStorage.getItem('pr_places_cached')||'[]'); }catch(e){ done=[]; }
  for(const p of (typeof customPlaces==='function'?customPlaces():[])){ if(!navigator.onLine) break;
    const k=placeKey(p); if(done.includes(k)) continue;
    await preloadZone(p.lat,p.lng,p.n); done.push(k); localStorage.setItem('pr_places_cached',JSON.stringify(done)); }
}catch(e){} }
setTimeout(preloadAll, 6000);  // dopo il caricamento iniziale della mappa, per non competere con le tessere a schermo

$('btnHome').onclick=()=>{ const c=map.getCenter(); localStorage.setItem('pr_home',JSON.stringify({lat:c.lat,lng:c.lng,z:map.getZoom()}));
  $('info').style.display='block'; $('info').innerHTML='&#127968; Vista salvata come partenza (si apre qui la prossima volta)'; setTimeout(()=>$('info').style.display='none',2800); };

// ---- "Sei qui" (GPS reale) ----
let gpsMark=null, gpsAcc=null, gpsWatch=null, gpsCentered=false;
$('btnGps').onclick=()=>{
  if(gpsWatch!=null){ navigator.geolocation.clearWatch(gpsWatch); gpsWatch=null;
    if(gpsMark){map.removeLayer(gpsMark);gpsMark=null;} if(gpsAcc){map.removeLayer(gpsAcc);gpsAcc=null;}
    $('btnGps').classList.remove('active'); $('info').style.display='none'; return; }
  if(!navigator.geolocation){ $('info').style.display='block'; $('info').innerHTML='GPS non disponibile su questo dispositivo'; return; }
  $('btnGps').classList.add('active'); gpsCentered=false;
  $('info').style.display='block'; $('info').innerHTML='&#128205; Cerco la tua posizione GPS&hellip;';
  gpsWatch=navigator.geolocation.watchPosition(p=>{
    const la=p.coords.latitude, lo=p.coords.longitude, ac=p.coords.accuracy||30, ll=[la,lo];
    if(!gpsMark){ gpsMark=rulerSnappable(L.circleMarker(ll,{radius:8,color:'#fff',fillColor:'#16e0ff',fillOpacity:1,weight:3}).addTo(map));
      gpsAcc=L.circle(ll,{radius:ac,color:'#16e0ff',fillColor:'#16e0ff',fillOpacity:0.1,weight:1}).addTo(map); }
    else { gpsMark.setLatLng(ll); gpsAcc.setLatLng(ll).setRadius(ac); }
    gpsMark.bindPopup('&#128205; Sei qui &middot; &plusmn;'+Math.round(ac)+' m');
    if(!gpsCentered){ gpsCentered=true; map.setView(ll,Math.max(map.getZoom(),16)); }
    $('info').innerHTML='&#128205; <b>Sei qui</b> &middot; &plusmn;'+Math.round(ac)+' m &middot; <span class="sub">'+la.toFixed(5)+', '+lo.toFixed(5)+'</span>';
  }, e=>{ $('info').style.display='block'; $('info').innerHTML='GPS: '+((e&&e.message)||'permesso negato'); $('btnGps').classList.remove('active'); if(gpsWatch){navigator.geolocation.clearWatch(gpsWatch);gpsWatch=null;} },
  {enableHighAccuracy:true,maximumAge:2000,timeout:15000});
};
