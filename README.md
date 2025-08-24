# Webentwicklungsprojekt Wayfinder

* wayfinder-front → Angular SPA (UI, Routing, Top10 etc.)
* wayfinder-api → REST-API mit Swagger, DB-Speicherung

## Projektstruktur
Der für den Aufbau des Repositorys ist hier dargestellt. Dies wird regelmässig während der Projektumsetzung, wenn nötig angepasst.

```
├── .gitignore        <-- Root: nur generische Regeln (IDE, OS, tmp)
├── README.md         <-- Gesamtprojekt (Intro, Struktur, Abgabehinweise)

wayfinder-front/      <-- Angular SPA (Frontend)
│   ├── .gitignore    
│   ├── angular.json
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── README.md     <-- nur Frontend-Doku (Setup, Befehle, etc.)
│   └── src/

wayfinder-api/        <-- REST API (z. B. Node/Nest/Express, DB)
│   ├── .gitignore   
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md    (Swagger, Endpoints, Tests)
│   └── src/
```

### Vorteile dieser Struktur sind: 
- Klar getrennte Teilprojekte
- CI/CD-ready

## Technologien
- Frontend
    - Framework: Angular 20
    - UI-Komponenten: Angular Material
    - Sprache: TypeScript
    - Styles: SCSS
    - Testing:
        - Unit-Tests: Jest
        - Akzeptanztests (E2E): Playwright

- Backend
    - Runtime/Framework: Node.js 20 + NestJS
    - Sprache: TypeScript
    - REST-API: NestJS Controllers/Services
    - API-Dokumentation: @nestjs/swagger (OpenAPI/Swagger UI)
    - Datenbank: PostgreSQL (Produktion) / SQLite (lokal)
    - ORM: Prisma
    - Security: class-validator + ValidationPipe, helmet, cors, throttling
    - Testing:
        - Unit-Tests: Jest
        - Integration/E2E-Tests: Supertest
    - Deployment: Docker, GitHub Actions


## Planungs‑Checkliste

### 0) Projekt & Repos
- [ ] Repo-Struktur steht: `wayfinder-front/` (SPA) + `wayfinder-api/` (REST+DB)
- [ ] `.gitignore` je Teilprojekt (node_modules, dist, coverage, .env, .idea)
- [ ] Root-README mit Struktur, Startanleitung, Technologien

---

### Frontend (Angular 20 + Material + SCSS)
#### UI & Funktionalität
- [ ] UI-Skelett: Header, Suchbereich, Kartenbereich, „Top 10 Routen“
- [ ] Form: Startort + Zielort + „Route berechnen“-Button
- [ ] Autocomplete (OpenRouteService `geocode/autocomplete`)
- [ ] Geocoding (ORS `geocode/search`) → Koordinaten ermitteln
- [ ] Routenberechnung (ORS `v2/directions`) → GeoJSON/Polyline
- [ ] Karte rendern (Leaflet/MapLibre) + Route + Marker Start/Ziel
- [ ] „Top 10 meistgesuchte Routen“ (localStorage, sortiert, klickbar)
- [ ] Error-Handling/Toasts (z. B. Angular Material Snackbar)
- [ ] Loading-States (Spinner/Progress)

#### Architektur & Qualität
- [ ] Komponenten: `SearchComponent`, `RouteResultComponent`, `TopRoutesComponent`, `MapComponent`
- [ ] Services: `OrsService` (API-Aufrufe), `TopRoutesService` (localStorage)
- [ ] Environment: API-Base-URL, Feature-Flags, ORS‑Proxy‑Pfad
- [ ] Accessibility: Labels, ARIA, Tastaturnavigation, Kontraste
- [ ] Responsives Layout (Mobile first)

#### Tests (Frontend)
- [ ] **Unit (Jest)**: Services (Mocks), Komponenten (Inputs/Outputs, Rendering)
- [ ] **Akzeptanz/E2E (Playwright)**:
    - [ ] „Berlin → Hamburg“ ergibt Route
    - [ ] Autocomplete zeigt Vorschläge
    - [ ] Top‑10 wird aktualisiert und anklickbar wiederverwendbar
- [ ] Coverage-Report (mind. Richtwert z. B. 80%)

---

#### REST‑API + DB (NestJS + Prisma + PostgreSQL)
### Endpunkte (RML2)
- [ ] `POST /routes` – Route speichern (DTO-Validierung)
- [ ] `GET /routes` – Liste mit Paging/Filter
- [ ] `GET /routes/:id` – Details
- [ ] `DELETE /routes/:id` – löschen
- [ ] (Optional) `PUT /routes/:id` – bearbeiten
- [ ] ORS‑Proxy:
    - [ ] `GET /ors/autocomplete?q=...`
    - [ ] `GET /ors/geocode?q=...`
    - [ ] `POST /ors/directions` (Body: Start/Ziel)  
      (→ API‑Key **nur** serverseitig nutzen)

#### Datenbank & Schema
- [ ] Prisma Schema (Route mit Geometrie/GeoJSON, Distanz, Dauer, Timestamps)
- [ ] Migrationen erstellt & dokumentiert
- [ ] Seed/Dev‑Daten (optional)
- [ ] DB‑User mit minimalen Rechten (Prod)

#### Sicherheit & Qualität
- [ ] **ValidationPipe** (whitelist + forbidNonWhitelisted)
- [ ] **class-validator** DTOs (z. B. `@IsLatitude`, `@IsLongitude`, `@IsString`)
- [ ] **Prisma/ORM** (keine Raw‑SQL ohne Bindings) → Schutz vor SQL Injection
- [ ] **helmet**, **CORS**, **Rate Limiting** (throttler)
- [ ] Fehler-/Exception-Filter, Logging

#### Doku & Tests (Backend)
- [ ] Swagger via `@nestjs/swagger` + Swagger UI erreichbar
- [ ] **Unit (Jest)**: Services, Mapper, Validatoren
- [ ] **Integration/E2E (Jest + Supertest)**: Routen‑CRUD, ORS‑Proxy
- [ ] `.env.example` vorhanden (keine Secrets im Repo)

---

### Gemeinsame Anforderungen aus Aufgabe
- [ ] SPA lädt & zeigt Route (Karte, Linie, Marker)
- [ ] Autocomplete funktioniert mit ORS
- [ ] Top‑10 meistgesuchte Routen lokal gespeichert & angezeigt
- [ ] REST‑API speichert persönliche Routen in DB
- [ ] **Swagger** dokumentiert API (min. RML2)
- [ ] **Akzeptanztests automatisiert** (Playwright)
- [ ] **Unit-Tests** für eigenen Code (Front & Back)
- [ ] **SQL Injection** wirksam verhindert (ORM + Validation)

---

### CI/CD & Deployment
- [ ] GitHub Actions Workflow(s):
    - [ ] Frontend: `npm ci`, Lint, **Jest**, **Playwright** (headless), Build
    - [ ] Backend: `npm ci`, Lint, **Jest/Supertest**, Prisma Migrate (CI‑DB), Build
- [ ] Artefakt-/Coverage-Uploads (optional)
- [ ] Hosting Frontend (GitHub Pages/Netlify/Vercel – statisch)
- [ ] Hosting Backend (Render/Fly.io/Heroku Alternative/Docker auf Server)
- [ ] Env‑Vars in CI gesetzt (ORS_API_KEY, DB_URL)
- [ ] (Optional) Dockerfiles + docker-compose (API + Postgres)

---

### Qualität & Doku
- [ ] Root‑README: Projektziel, Struktur, Startanleitung, Technologien, Bewertungsbezug
- [ ] Frontend‑README: Setup, Befehle, Test‑Commands, env‑Hinweise
- [ ] API‑README: Endpunkte, Swagger‑Link, DB‑Setup, Test‑Commands
- [ ] Screenshots/GIFs (kurze Demo im README)
- [ ] Lizenz/Impressum (falls gefordert)

---

### Abnahme‑Kriterien (DoD)
- [ ] Nutzer kann Start/Ziel eingeben → Route erscheint auf Karte
- [ ] Autocomplete schlägt Adressen vor
- [ ] Top‑10 Liste zeigt meistgesuchte Routen und ist klickbar
- [ ] Route kann per REST gespeichert & gelesen werden
- [ ] Alle Tests grün (Unit + Akzeptanz/E2E)
- [ ] Swagger vollständig & erreichbar
- [ ] SQL Injection Schutz nachweisbar (Code + kurze Doku)
- [ ] Build & Deploy automatisiert

