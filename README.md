# Wayfinder – Webapplikation zur Routenberechnung

## Übersicht

Dieses Projekt wurde im Rahmen des Moduls *Web-Engineering* entwickelt.
Ziel ist die Umsetzung einer **Single Page Application (SPA)**, die zwei Orte aufnimmt, eine Route berechnet und visualisiert.
Zusätzlich werden die **Top-10 meistgesuchten Routen** gespeichert und angezeigt.

Die Lösung besteht aus zwei getrennten Teilprojekten:

* **wayfinder-front:** Angular SPA (UI, Suche, Routenanzeige, Top-10)
* **wayfinder-api:** REST-API (NestJS + Prisma, Swagger, DB-Speicherung)

---

## Projektstruktur

```
├── README.md           <-- Gesamtprojekt (Intro, Setup, Abgabehinweise)
├── wayfinder-front/    <-- Angular SPA (Frontend)
│   └── src/
└── wayfinder-api/      <-- REST-API + DB
    └── src/
```

Vorteile: klare Trennung von Frontend und Backend, CI/CD-tauglich

---

## Quickstart (lokal)

### Voraussetzungen

* Node.js ≥ 20, npm ≥ 10
* Angular CLI (`npm i -g @angular/cli`)
* Optional: Docker für PostgreSQL

### Frontend starten

```bash
cd wayfinder-front
npm ci
ng serve   # läuft auf http://localhost:4200
```

### Backend starten

```bash
cd wayfinder-api
npm ci
npm run start:dev   # läuft auf http://localhost:3000
```

---

## Technologien

### Frontend

* Angular 20 + Angular Material
* TypeScript, SCSS
* Leaflet/MapLibre für Karten
* Tests: Jest (Unit), Playwright (E2E)

### Backend

* Node.js 20 + NestJS
* Prisma ORM, PostgreSQL (Produktion), SQLite (Entwicklung/Test)
* Swagger (OpenAPI 3.0)
* Sicherheit: ValidationPipe, class-validator, helmet, cors, throttling
* Tests: Jest (Unit), Supertest (Integration)
---

## Funktionalität

### Frontend

* Eingabe von Start- und Zielort
* Autocomplete mit ORS `geocode/autocomplete`
* Routenberechnung mit ORS `v2/directions`
* Karte mit Route und Markern für Start/Ziel
* Top-10 Suchanfragen (localStorage)
* Favoriten speichern über API
* Responsives und barrierearmes Design

### Backend

* REST-API (mindestens Richardson Maturity Level 2)
* CRUD-Endpunkte für gespeicherte Routen
* Proxy zu ORS-Endpunkten (API-Key nur serverseitig)
* Schutz vor SQL Injection durch ORM und Validierung
* Dokumentation mit Swagger UI

---

## API-Dokumentation

Swagger-UI: [http://localhost:3000/api](http://localhost:3000/api)
Health Check: [http://localhost:3000/healthz](http://localhost:3000/healthz)

### Wichtige Endpunkte

* `GET /ors/autocomplete` – Autocomplete
* `GET /ors/geocode` – Geocoding
* `POST /ors/directions` – Route berechnen
* `POST /routes` – Route speichern
* `GET /routes` – Routenliste
* `GET /routes/{id}` – Route abrufen
* `DELETE /routes/{id}` – Route löschen

### Beispielantworten

Autocomplete:

```json
{
  "suggestions": [
    { "label": "Zürich, CHE", "coord": [8.5417, 47.3769] },
    { "label": "Bern, CHE", "coord": [7.4474, 46.9481] }
  ]
}
```

Directions:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "geometry": {
        "type": "LineString",
        "coordinates": [[8.5417, 47.3769], [7.4474, 46.9481]]
      },
      "properties": { "summary": { "distance": 121000, "duration": 4800 } }
    }
  ]
}
```

---

## Tests

### Frontend

* Unit-Tests mit Jest (Services, Komponenten)
* Akzeptanz/E2E-Tests mit Playwright (Autocomplete, Route Berlin–Hamburg, Top-10) (nicht beendet)

### Backend

* Unit-Tests mit Jest (Validatoren, Services)
* Integrationstests mit Supertest (CRUD-Endpunkte, ORS-Proxy)


---

## Planungs-Checkliste

### Frontend

* [x] UI-Skelett (Suchfeld, Karte, Top-10)
* [x] Autocomplete eingebaut
* [x] Route berechnen und Karte rendern
* [x] Top-10 speichern und darstellen

### Backend

* [x] Setup NestJS + Prisma
* [x] Routen-CRUD-Endpunkte
* [x] ORS-Proxy
* [x] Swagger-Dokumentation
* [x] Tests für Services und Endpunkte

### Deployment
Kein Deployment

---

## Bewertungskriterien

### Frontend

* Funktionalität (10 Punkte): ja
* Code-Verständlichkeit (10 Punkte): na ja...
* Tests (10 Punkte): ja (Akzeptanztest ungenügend)
* Klassen/Selektoren (5 Punkte): hoffentlich ja
* Mobile/Accessibility (5 Punkte): ja

### Backend

* Funktionalität (10 Punkte): ja
* Tests (10 Punkte): ja
* SQL Injection Schutz (10 Punkte): ja
* Swagger Dokumentation (5 Punkte): ja
* RESTfulness (5 Punkte): ja


---

## Abnahmekriterien

* Route wird korrekt auf Karte angezeigt
* Autocomplete schlägt Adressen vor
* Top-10-Liste ist klickbar und wiederverwendbar
* Routen können über API gespeichert und gelesen werden
* Swagger ist erreichbar und vollständig
* Alle Tests laufen erfolgreich
* SQL Injection Schutz ist implementiert

