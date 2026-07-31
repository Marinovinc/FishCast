# FishCast — Analisi concorrenza e feature mancanti

**Data:** 31/07/2026
**Scopo:** confronto onesto tra FishCast e le app di pesca presenti sugli store / sui siti specializzati, con la lista delle funzioni che **loro hanno e noi no**.

---

## 1. App esaminate

| App | Tipo | Punto di forza |
|---|---|---|
| Fishbrain | social + forecast (USA/global) | community 15-20 mln, BiteTime AI, mappe Navionics/C-Map |
| Fishing Points | mappe + previsioni | waypoint, maree/solunare, offline, log catture |
| WeFish | forecast + social (EU/Spagna) | FishGuru (specie attive + esca consigliata), marketplace |
| Navionics Boating (Garmin) | cartografia nautica | SonarChart HD, community edits, sync chartplotter |
| Fish Deeper (Deeper Sonar) | sonar + mappe | batimetria REALE creata da riva col sonar, mappe offline globali |
| Nautide | maree/vento/onde (IT) | 25.000 stazioni costiere, solunare, barometro, 60+ lingue |
| FishTrack / RipCharts | satellitare offshore | SST cloud-free, clorofilla, correnti, altimetria |
| Fishbox / GilledIt / Pro Angler | forecast + log | assistente AI, marketplace attrezzatura, solunare |
| RecFishing | istituzionale IT | **obbligatoria da maggio 2026** per registrare catture di tonno rosso, spada, lampuga, alalunga |

---

## 2. Cosa abbiamo NOI oggi (baseline verificata sul codice)

Cartografia sottocosta: SDB satellitare Sentinel-2 10 m (Stumpf) con calibrazione in metri, composito multi-scena, isobate marching-squares anche fitte 0,5 m, rilevamento canaloni/truogoli (rip), substrato EMODnet Geology, Posidonia, isobate EMODnet, carta nautica OpenSeaMap, base satellitare Esri.

Strumenti pesca: righello di lancio A/B trascinabile con profilo del fondale e click sul grafico, prede probabili filtrate per distanza/substrato/stagione/giorno-notte con esca e tecnica, punti/catture con profondità e fondale automatici, GPS "sei qui", località salvate, calibrazione manuale su punti noti.

Sistema: PWA installabile, cache offline della zona (~3,5 km, z13-17), multilingua IT/EN, service worker con auto-update, tutto client-only e gratuito senza account.

---

## 3. FEATURE CHE LORO HANNO E NOI NO

### 3.1 Meteo-marino e previsioni — **la lacuna più grande** (tutte le app la coprono)
- Vento: velocità, raffiche, direzione, previsione oraria e a 7 giorni
- Onde: altezza, periodo, direzione dell'onda lunga (decisivo per il surfcasting: mare mosso = mormore/spigole sotto riva)
- Marea: grafico giornaliero, alta/bassa, altezza, coefficiente, tabella mensile
- Pressione barometrica con **trend** (il "barometro del pescatore")
- Temperatura acqua e aria, nuvolosità, pioggia, visibilità, umidità
- Mappe meteo animate a strati stile Windy
- Dati da boe ondametriche/stazioni in tempo reale

### 3.2 Solunare e astronomia (Nautide, Fishing Points, Pro Angler, Fishbox)
- Alba/tramonto, sorgere/tramontare della luna, azimut
- Fasi lunari e calendario lunare
- **Periodi solunari maggiori e minori** con le fasce orarie migliori
- Grafico orario di attività + tabella mensile dei giorni migliori

### 3.3 Punteggio di morso / previsione attività per specie
- "BiteTime" (Fishbrain), "FishGuru" (WeFish): punteggio orario di probabilità di catture
- Quali specie sono attive **ora** in quel punto
- Esca/colore consigliati derivati dai dati reali della community
- Assistente AI conversazionale (Fishbox)

*Noi abbiamo le prede per distanza/substrato/stagione, ma è una tabella statica: non c'è punteggio, non c'è meteo dentro, non impara dai dati.*

### 3.4 Logbook catture professionale
- **Foto della cattura** (noi: nessuna foto)
- Peso e lunghezza strutturati, non testo libero
- Meteo/marea/luna allegati automaticamente alla cattura (noi alleghiamo solo profondità e fondale)
- Statistiche personali: specie più catturate, spot migliori, andamento nel tempo
- Filtri e ricerca nello storico, esportazione

### 3.5 Account, cloud e sincronizzazione — **rischio concreto per noi**
- Login, backup su cloud, sync fra telefono e PC, ripristino su nuovo dispositivo
- **Noi salviamo tutto in localStorage**: se l'utente pulisce i dati del browser o cambia telefono, perde punti, catture, calibrazioni e località. Nessuno può recuperarli.
- Web app installate su iOS: i dati possono essere eliminati dal sistema dopo settimane di inutilizzo

### 3.6 Social e community
- Feed catture, amici, follower, commenti
- Spot e catture segnalate dalla community sulla mappa (il vero motore di Fishbrain: 20 mln di avvistamenti)
- Sfide, classifiche, gare, livelli
- Controlli privacy sulla posizione delle catture (WeFish le tiene riservate)

### 3.7 Riconoscimento specie e schede pesce
- Identificazione della specie **da foto** con AI (Fishbrain 300+ specie, Picture Fish 2500+, Fishby)
- Schede specie con foto, habitat, tecniche, esche, taglie

### 3.8 Normative, licenze, aree vietate
- Taglie minime, periodi di divieto, quote giornaliere per specie
- Regolamenti locali (Fishbrain li copre in 30+ stati USA)
- **Aree marine protette e zone di divieto sulla mappa** — per la pesca da riva in Italia è rilevantissimo (Circeo, AMP, foci, zone portuali)
- Integrazione/collegamento con **RecFishing**, obbligatoria in Italia da maggio 2026

### 3.9 Navigazione e waypoint avanzati
- Rotte multi-punto con distanze e rilevamenti
- Registrazione tracce GPS del percorso
- **Import/export GPX** e condivisione dei punti con gli amici
- Ricerca per indirizzo/nome località (geocoding) — noi abbiamo solo i preset e i punti salvati
- Icone/categorie personalizzate per i marker

### 3.10 Batimetria e cartografia di terze parti
- Carte batimetriche ufficiali con sondaggi reali (Navionics SonarChart HD, C-Map)
- Batimetria misurata dagli utenti col sonar e condivisa (Deeper, community Navionics)
- Vista 3D del fondale
- **Nota onesta:** la nostra SDB 10 m è più fine di EMODnet sottocosta, ma resta una *stima* satellitare; loro hanno misure vere (dove esistono).

### 3.11 Offline serio
- Download di mappe per intere regioni/aree estese, non solo il riquadro corrente
- Deeper: batimetria globale offline gratuita
- Noi: solo ~3,5 km di tessere attorno alla località, e la SDB di una scena sola

### 3.12 Notifiche e avvisi
- Avviso quando le condizioni diventano ottimali nel proprio spot
- Allerta meteo/mare
- Promemoria marea e finestre solunari

### 3.13 Integrazioni di piattaforma
- App native negli store (discovery, recensioni, pagamenti in-app) — noi PWA per scelta
- Widget in schermata home, Apple Watch, CarPlay
- Sync con chartplotter/ecoscandaglio (Garmin)

### 3.14 Contenuti e commercio
- Marketplace attrezzatura usata (GilledIt, WeFish)
- Tackle box / gestione attrezzatura, nodi, tutorial, guide tecniche
- Pianificatore uscite e "giorni migliori" del mese

### 3.15 Dati satellitari oceanografici (FishTrack, RipCharts)
- SST cloud-free, clorofilla, correnti, altimetria, salinità, temperatura a più profondità
- *Noi abbiamo già l'app Clorofilla separata: sono dati che potremmo portare dentro FishCast.*

### 3.16 Copertura e lingue
- Nautide: 25.000 stazioni costiere, 60+ lingue; Fishbrain/Fishing Points: copertura globale
- Noi: 2 lingue e calibrazione affidabile solo sul litorale laziale sabbioso (Sabaudia = dato ISPRA/ENEA)

---

## 4. Cosa abbiamo NOI che loro NON hanno (da difendere)

1. **Batimetria satellitare 10 m dei primi 300 m di sottocosta** — la fascia dove si lancia, dove Navionics/EMODnet sono cieche o grezze
2. **Isobate fitte a 0,5 m nella zona di risacca**
3. **Rilevamento dei canaloni/truogoli (rip channel)** — nessuna app di pesca lo fa; è anche una feature di sicurezza
4. **Righello di lancio con profilo del fondale** lungo la traiettoria, con distanza reale e profondità punto per punto
5. **Prede in funzione di distanza dalla riva + substrato + stagione + giorno/notte**, con esca e tecnica
6. **Substrato e Posidonia** sovrapposti alla mappa
7. **Calibrazione su profilo reale certificato** (studio ISPRA/ENEA Sabaudia) e sui punti noti dell'utente
8. Nessun account, nessun tracciamento, gratuito, funziona da browser

**Posizionamento:** loro sono app *meteo + social + logbook*; noi siamo l'unica app di *lettura morfologica del sottocosta per chi pesca da riva*. La sovrapposizione è minore di quanto sembri.

---

## 5. Priorità consigliate (rapporto valore/sforzo)

**Priorità 1 — colmare le lacune che pesano davvero, tutte con API gratuite e client-only:**
1. Meteo-marino (vento, onde, pressione, temperatura) e marea — Open-Meteo Marine API, gratuita, senza chiave
2. Solunare e luna (alba/tramonto, fasi, periodi maggiori/minori) — calcolabile in locale, zero API
3. Backup/ripristino dei dati: esportazione e importazione di un file JSON con punti, catture, calibrazioni e località (risolve il rischio di perdita dati senza dover costruire un backend)

**Priorità 2 — valore alto, sforzo medio:**
4. Foto nelle catture (salvate localmente) + statistiche personali
5. Export/import GPX e condivisione punti
6. Punteggio di morso orario che combina meteo + marea + solunare + le nostre prede
7. Ricerca località per nome (geocoding Nominatim)

**Priorità 3 — richiede infrastruttura o contenuti:**
8. Account cloud e sync (serve backend: costo ricorrente)
9. Aree marine protette e taglie minime italiane
10. Riconoscimento specie da foto
11. Community e catture condivise

---

## 6. Fonti

- Fishbrain — pagina funzionalità ufficiale e schede App Store / Google Play
- Fishing Points — schede App Store / Google Play e sito ufficiale
- WeFish — sito ufficiale e Google Play
- Navionics Boating — App Store e Google Play
- Fish Deeper / Deeper Sonar — pagine ufficiali app e pesca da riva
- Nautide — App Store IT
- FishTrack e RipCharts — siti ufficiali e recensioni comparate
- Rassegne "migliori app da pesca 2026" (Fishbox, GilledIt, Kayak Angler, iOS Hacker)
- RecFishing — obbligo app per pesca sportiva in Italia da maggio 2026 (Il Messaggero, FishAndTips)
