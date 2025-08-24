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
