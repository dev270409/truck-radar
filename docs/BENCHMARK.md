# Benchmark flotta automatico

Implementazione del 24/11/2026. Sostituisce il vecchio benchmark basato solo sui rifornimenti con un calcolo che usa tutti i dati reali disponibili.

## 1. Fonti dati

| Dato | Fonte | Fallback |
|---|---|---|
| Km per mezzo | `GeotabTripSnapshot` ultimi 12 mesi, esclusi gli spostamenti <3 km/8 min | `TripKm` dei viaggi |
| Carburante | `FuelLog` (costo e litri reali) | stima: km / consumo categoria × prezzo di riferimento |
| Altri costi | `VehicleCost` ultimi 12 mesi | 0 (warning) |
| Ricavi | `TripStatementLine` collegate a `Trip`/`Vehicle` | 0 |
| Previsione 12 mesi | `getEarningsForecast` sui mesi importati | — |

## 2. Metriche

Per mezzo e per categoria:

- **km** (Geotab o viaggi);
- **costo/km** = (carburante + altri costi) / km;
- **ricavo/km** = ricavi rendiconti / km;
- **margine/km** = ricavo/km − costo/km;
- **consumo km/l** (pieno-pieno se ci sono rifornimenti, altrimenti categoria);
- **copertura** = viaggi pagati / viaggi Geotab reali;
- **vs media aziendale** su costo/km e ricavo/km;
- **stima 12 mesi** dai rendiconti importati.

## 3. Perché i numeri possono sembrare bassi

Il benchmark è volutamente prudente:

- i km Geotab includono **tutti** i viaggi del mezzo, anche per altri committenti;
- i ricavi includono **solo i rendiconti importati**;
- finché la copertura è bassa, il margine/km è sottostimato.

La pagina mostra un warning con la percentuale di copertura e invita a importare gli altri mesi/provider. Più rendiconti si caricano, più il margine diventa reale.

## 4. Esempio TAROS (novembre 2026)

Con un solo rendiconto (Energy Trucks, ottobre) e 1.664 tracciati Geotab:

- **34.109 km** reali considerati (551 viaggi Geotab reali);
- **23 viaggi pagati** collegati (copertura **4%**);
- carburante **stimato** 17.054,56 € (nessun rifornimento registrato);
- costo/km **0,50 €**;
- ricavo/km **0,22 €**;
- margine/km **−0,28 €** (non reale: mancano gli altri provider);
- 200 € di ricavi non collegati a un mezzo.

Questi numeri servono a capire cosa manca, non a giudicare l'azienda.

## 5. API e pagina

- `GET /api/benchmark?months=12` (permesso `analytics`).
- `/dashboard/benchmark` mostra KPI, categorie, dettaglio per mezzo, fonti e warning.
- Il calcolo avviene a ogni apertura: nessun dato da aggiornare a mano.

## 6. Prossimi passi

1. Inserire benchmark esterni di mercato (costo/km per categoria) come confronto separato.
2. Costo autista per viaggio e per km.
3. Benchmark mensile storico, non solo ultimi 12 mesi.
4. Esportazione CSV/PDF del benchmark.
5. Confronto tra mezzi della stessa categoria e alert sui peggiori.
