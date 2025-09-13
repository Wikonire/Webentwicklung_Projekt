import { computed, Injectable, signal, inject } from '@angular/core';
import { RouteFeatureCollection } from '../models/route-feature-collection.model';
import { OrsProfile, profiles } from '../models/ors-profile.model';
import { OrsService } from './ors.service';
import { AppRoute, LngLat, TopSearchEntry } from '../models/routes.model';
import {filter, take} from 'rxjs/operators';
import { SnackBarService } from './snack-bar.service';
import { RoutesService } from './routes.service';
import {catchError, EMPTY, map} from 'rxjs';

const TOP_KEY = 'wayfinder_top_searches_v1';

@Injectable({ providedIn: 'root' })
export class RouteStore {
  private orsService = inject(OrsService);
  private snackBar = inject(SnackBarService);
  private routesService = inject(RoutesService);

  /** aktuelle Route */
  private currentRouteSignal = signal<AppRoute | null>(null);
  readonly routeResult = computed(() => this.currentRouteSignal());
  readonly routeGeoJson = computed<RouteFeatureCollection | null>(
    () => this.currentRouteSignal()?.geometry ?? null
  );

  /** gespeicherte Routen aus DB */
  private savedRoutesSignal = signal<AppRoute[]>([]);
  readonly savedRoutes = computed(() => this.savedRoutesSignal());

  /** Top-Suchen (im LocalStorage) */
  private topSearchesSignal = signal<TopSearchEntry[]>(this.loadTopSearches());
  readonly topSearches = computed(() => this.topSearchesSignal());

  constructor() {
    this.loadSavedRoutesList();
  }

  /** Route setzen / leeren */
  setComputedRoute(newRoute: AppRoute): void {
    this.currentRouteSignal.set(newRoute);
  }

  /** Routing mit ORS berechnen */
  computeRoute(
    startCoord: LngLat,
    destinationCoord: LngLat,
    profile: OrsProfile,
    startLabel: string,
    destinationLabel: string
  ): void {
    this.fetchRoute(startCoord, destinationCoord, profile, startLabel, destinationLabel).subscribe({
      next: route => {
        if (!route && !route['id'] ) return;

        this.setComputedRoute(route);
        this.snackBar.info(
          `Route ${startLabel} → ${destinationLabel} berechnet (${this.getProfileLabel(profile)})`
        );

        this.addToTopSearches({
          timestamp: new Date(),
          id: crypto.randomUUID(),
          startLabel,
          destinationLabel,
          profile,
          startCoord,
          destinationCoord,
        });
      },
      error: (error) => {
        console.error('Fehler beim Berechnen der Route', error);
        this.snackBar.error('Fehler beim Berechnen der Route');
      }
    });
  }

  /** Top-Suchen laden */
  private loadTopSearches(): TopSearchEntry[] {
    try {
      const json = localStorage.getItem(TOP_KEY);
      return json ? (JSON.parse(json) as TopSearchEntry[]) : [];
    } catch {
      return [];
    }
  }

  /** Top-Suchen pflegen */
  addToTopSearches(newEntry: TopSearchEntry): void {
    const current = [...this.topSearches()];

    const key = (e: TopSearchEntry) =>
      `${e.startLabel}__${e.destinationLabel}__${e.profile}`;
    const now = new Date();

    const existingIndex = current.findIndex(e => key(e) === key(newEntry));
    if (existingIndex >= 0) {
      const updated = { ...current[existingIndex] };
      updated.count = (updated.count ?? 1) + 1;
      updated.timestamp = now;
      current.splice(existingIndex, 1, updated);
    } else {
      current.push({ ...newEntry, count: 1, timestamp: now });
      this.snackBar.info(
        `Neue Top-Suche: ${newEntry.startLabel} → ${newEntry.destinationLabel}`
      );
    }

    // erst nach count, dann timestamp sortieren
    current.sort(
      (a, b) =>
        (b.count ?? 0) - (a.count ?? 0) ||
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (current.length > 10) {
      current.length = 10;
    }

    this.topSearchesSignal.set([...current]);
    localStorage.setItem(TOP_KEY, JSON.stringify(current));
  }

  /** ---- Favoriten: über DB ---- */

  loadSavedRoutesList(): void {
    this.routesService.list().subscribe({
      next: routes => this.savedRoutesSignal.set(routes),
      error: (error) => {
        console.error('Fehler beim Laden gespeicherter Routen', error);
        this.snackBar.error('Konnte gespeicherte Routen nicht laden');
      },
    });
  }

  saveFromTopSearch(entry: TopSearchEntry): void {
    // Prüfen ob Route schon vorhanden (Profil + Labels)
    const exists = this.savedRoutes().some(route =>
      route.startLabel === entry.startLabel &&
      route.destinationLabel === entry.destinationLabel &&
      route.profile === entry.profile
    );

    if (exists) {
      this.snackBar.info(`Route ist bereits gespeichert`);
      return;
    }

    if (!entry.startCoord || !entry.destinationCoord) return;

    this.fetchRoute(
      entry.startCoord,
      entry.destinationCoord,
      entry.profile,
      entry.startLabel,
      entry.destinationLabel
    ).subscribe({
      next: route => {
        // nur speichern, wenn die Route wirklich valide ist
        if (
          !route ||
          !route.geometry ||
          !route.geometry.features?.length
        ) {
          this.snackBar.error('Route konnte nicht berechnet werden');
          return;
        }

        const newRoute: AppRoute = {
          id: crypto.randomUUID(),
          userId: 'u1',
          startLabel: entry.startLabel,
          destinationLabel: entry.destinationLabel,
          startCoord: entry.startCoord,
          destinationCoord: entry.destinationCoord,
          profile: entry.profile,
          geometry: route.geometry,
          distance: route.geometry?.features[0]?.properties?.summary?.distance ||0,
          duration:  route.geometry?.features[0]?.properties?.summary?.duration ||0,
        };

        this.routesService.save(newRoute).subscribe({
          next: saved => {
            this.snackBar.info(
              `Route ${saved.startLabel} → ${saved.destinationLabel} gespeichert (${this.getProfileLabel(saved.profile)})`
            );
            this.loadSavedRoutesList();
          },
          error: (error) => {
            console.error('Fehler beim Speichern der Route in DB', error);
            this.snackBar.error('Fehler beim Speichern der Route in DB');
          },
        });
      },
      error: (error) => {
        console.error('Fehler beim Berechnen der Route', error);
        this.snackBar.error('Fehler beim Berechnen der Route');
      }
    });
  }


  removeSavedRoute(id: string): void {
    this.routesService.remove(id).subscribe({
      next: () => {
        this.snackBar.info('Route entfernt');
        this.loadSavedRoutesList();
      },
      error: (error) => {
        console.error('Fehler beim Entfernen der Route', error);
        this.snackBar.error('Fehler beim Entfernen der Route');
      },
    });
  }

  loadSavedRoute(routeId: string): void {
    this.routesService.getOne(routeId).subscribe({
      next: found => {
        if (found) {

          this.setComputedRoute(found);
          this.addToTopSearches({
            timestamp: new Date(),
            id: found.id,
            startLabel: found.startLabel,
            destinationLabel: found.destinationLabel,
            profile: found.profile,
            startCoord: found.startCoord,
            destinationCoord: found.destinationCoord,
          });
        } else {
          this.snackBar.error('Route nicht gefunden');
        }
      },
      error: (error) => {
        console.error('Fehler beim Laden der Route', error);
        this.snackBar.error('Fehler beim Laden der Route');
      },
    });
  }


  getProfileLabel(profile: OrsProfile): string {
    return profiles.find(p => p.value === profile)?.label ?? profile;
  }

  /** gemeinsame Hilfsmethode für Routenfetch */
  private fetchRoute(
    startCoord: LngLat,
    destinationCoord: LngLat,
    profile: OrsProfile,
    startLabel: string,
    destinationLabel: string
  ) {
    return this.orsService.directionsAsRouteResult(
      startCoord,
      destinationCoord,
      profile,
      startLabel,
      destinationLabel
    ).pipe(
      take(1),
      catchError((error) => {
        console.error('Fetch-Fehler:', error);
        this.snackBar.error('Diese Suche ist nicht möglich');
        return EMPTY; // beendet den Stream sofort
      }),
      filter((route): route is AppRoute =>
        !!route &&
        !!route.profile &&
        !!route.geometry?.features?.length
      ),
      map(route => route)
    );
  }

  clearTopSearches(): void {
    this.topSearchesSignal.set([]);
    localStorage.removeItem(TOP_KEY);
    this.snackBar.info('Top-Suchen wurden gelöscht');
  }
}
