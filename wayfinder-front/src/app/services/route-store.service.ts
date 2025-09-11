import { computed, Injectable, signal, inject } from '@angular/core';
import { RouteFeatureCollection } from '../models/route-feature-collection.model';
import { OrsProfile, profiles } from '../models/ors-profile.model';
import { OrsService } from './ors.service';
import { AppRoute, LngLat, TopSearchEntry } from '../models/routes.model';
import { take } from 'rxjs/operators';
import { SnackBarService } from './snack-bar.service';

const TOP_KEY = 'wayfinder_top_searches_v1';
const SAVED_KEY = 'wayfinder_saved_routes_v1';

@Injectable({ providedIn: 'root' })
export class RouteStore {
  private orsService = inject(OrsService);
  private snackBar = inject(SnackBarService);

  /** aktuelle Route */
  private currentRouteSignal = signal<AppRoute | null>(null);
  readonly routeResult = computed(() => this.currentRouteSignal());
  readonly routeGeoJson = computed<RouteFeatureCollection | null>(
    () => this.currentRouteSignal()?.geometry ?? null
  );

  /** gespeicherte Routen */
  private savedRoutesSignal = signal<AppRoute[]>(this.loadSavedRoutes());
  readonly savedRoutes = computed(() => this.savedRoutesSignal());

  /** Top-Suchen */
  private topSearchesSignal = signal<TopSearchEntry[]>(this.loadTopSearches());
  readonly topSearches = computed(() => this.topSearchesSignal());

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
    this.orsService
      .directionsAsRouteResult(
        startCoord,
        destinationCoord,
        profile,
        startLabel,
        destinationLabel
      )
      .pipe(take(1))
      .subscribe({
        next: route => {
          if (!route) return;

          this.setComputedRoute(route);
          this.snackBar.info(
            `Route ${startLabel} → ${destinationLabel} berechnet (${this.getProfileLabel(profile)})`
          );

          this.addToTopSearches({
            timestamp: new Date(),
            id: crypto.randomUUID(),
            start: startLabel,
            destination: destinationLabel,
            profile,
            startCoord,
            destinationCoord,
          });
        },
        error: () => {
          this.snackBar.error('Fehler beim Berechnen der Route');
        }
      });
  }

  /** Top-Suchen laden / pflegen */
  private loadTopSearches(): TopSearchEntry[] {
    try {
      const json = localStorage.getItem(TOP_KEY);
      return json ? (JSON.parse(json) as TopSearchEntry[]) : [];
    } catch {
      return [];
    }
  }

  addToTopSearches(newEntry: TopSearchEntry): void {
    const current = [...this.topSearches()];
    const key = (e: TopSearchEntry) =>
      `${e.start}__${e.destination}__${e.profile}`;
    const now = new Date();

    const existingIndex = current.findIndex(e => key(e) === key(newEntry));
    if (existingIndex >= 0) {
      const updated = { ...current[existingIndex] };
      updated.count = (updated.count ?? 1) + 1;
      updated.timestamp = now;
      current.splice(existingIndex, 1, updated);
      this.snackBar.info(
        `Top-Suche aktualisiert: ${newEntry.start} → ${newEntry.destination}`
      );
    } else {
      current.push({ ...newEntry, count: 1, timestamp: now });
      this.snackBar.info(
        `Neue Top-Suche: ${newEntry.start} → ${newEntry.destination}`
      );
    }

    current.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (current.length > 10) {
      current.length = 10;
    }

    this.topSearchesSignal.set([...current]);
    localStorage.setItem(TOP_KEY, JSON.stringify(current));
  }

  /** gespeicherte Routen laden / verwalten */
  private loadSavedRoutes(): AppRoute[] {
    try {
      const json = localStorage.getItem(SAVED_KEY);
      return json ? (JSON.parse(json) as AppRoute[]) : [];
    } catch {
      return [];
    }
  }

  removeSavedRoute(id: string): void {
    const filtered = this.savedRoutesSignal().filter(r => r.id !== id);
    this.savedRoutesSignal.set(filtered);
    localStorage.setItem(SAVED_KEY, JSON.stringify(filtered));
    this.snackBar.info('Route entfernt');
  }

  saveFromTopSearch(entry: TopSearchEntry): void {
    if (!entry.startCoord || !entry.destinationCoord) return;

    this.orsService
      .directionsAsRouteResult(
        entry.startCoord,
        entry.destinationCoord,
        entry.profile,
        entry.start,
        entry.destination
      )
      .pipe(take(1))
      .subscribe({
        next: route => {
          if (!route) return;

          const current = this.savedRoutesSignal();
          const exists = current.some(
            r =>
              r.start === route.start &&
              r.destination === route.destination &&
              r.profile === route.profile
          );

          if (!exists) {
            const updated = [...current, route];
            this.savedRoutesSignal.set(updated);
            localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
            this.snackBar.info(
              `Route ${route.start} → ${route.destination} gespeichert (${this.getProfileLabel(
                route.profile
              )})`
            );
          } else {
            this.snackBar.info('Route bereits gespeichert');
          }
        },
        error: () => {
          this.snackBar.error('Fehler beim Speichern der Route');
        }
      });
  }

  getProfileLabel(profile: OrsProfile): string {
    return profiles.find(p => p.value === profile)?.label ?? profile;
  }

  loadSavedRoute(routeId: string): void {
    const found = this.savedRoutes().find(r => r.id === routeId);
    if (found) {
      this.setComputedRoute(found);
      this.snackBar.info(
        `Route ${found.start} → ${found.destination} geladen (${this.getProfileLabel(
          found.profile
        )})`
      );
    } else {
      this.snackBar.error('Route nicht gefunden');
    }
  }
}
