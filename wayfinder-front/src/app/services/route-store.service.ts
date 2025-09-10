import { computed, Injectable, signal, inject } from '@angular/core';
import {RouteResult, SavedRoute} from '../models/route-result.model';
import { RouteFeatureCollection } from '../models/route-feature-collection.model';
import { OrsProfile } from '../models/ors-profile.model';
import { LngLat, OrsService } from './ors.service';

export interface TopSearchEntry {
  id: string;
  start: string;
  destination: string;
  profile: OrsProfile;
  count?: number;
}

const TOP_KEY = 'wayfinder_top_searches_v1';
const SAVED_KEY = 'wayfinder_saved_routes_v1';

@Injectable({ providedIn: 'root' })
export class RouteStore {
  private orsService = inject(OrsService);

  // --- Aktuelle Route ---
  private currentRouteResult = signal<RouteResult | null>(null);
  routeResult = computed(() => this.currentRouteResult());
  routeGeoJson = computed<RouteFeatureCollection | null>(
    () => this.currentRouteResult()?.geometry ?? null
  );

  // --- Gespeicherte Routen ---
  private savedRoutesSignal = signal<SavedRoute[]>(this.loadSavedRoutes());
  savedRoutes = computed(() => this.savedRoutesSignal());

  // --- Aktuelle Route setzen ---
  setComputedRoute(newRoute: RouteResult): void {
    this.currentRouteResult.set(newRoute);
  }

  clearComputedRoute(): void {
    this.currentRouteResult.set(null);
  }

  // --- Routing mit ORS berechnen ---
  computeRoute(
    startCoord: LngLat,
    destinationCoord: LngLat,
    profile: OrsProfile,
    startLabel: string,
    destinationLabel: string
  ) {
    this.orsService
      .directionsAsRouteResult(
        startCoord,
        destinationCoord,
        profile,
        startLabel,
        destinationLabel
      )
      .subscribe(route => {
        if (route) {
          this.setComputedRoute(route);

          // Top-Suche speichern
          this.addToTopSearches({
            id:crypto.randomUUID(),
            start: startLabel,
            destination: destinationLabel,
            profile
          });
        }
      });
  }

  // --- Top Searches ---
  getTopSearches(): TopSearchEntry[] {
    try {
      const json = localStorage.getItem(TOP_KEY);
      return json ? (JSON.parse(json) as TopSearchEntry[]) : [];
    } catch {
      return [];
    }
  }

  addToTopSearches(newEntry: TopSearchEntry): void {
    const current = this.getTopSearches();
    const key = (e: TopSearchEntry) =>
      `${e.start}__${e.destination}__${e.profile}`;

    const existingIndex = current.findIndex(e => key(e) === key(newEntry));
    if (existingIndex >= 0) {
      const updated = { ...current[existingIndex] };
      updated.count = (updated.count ?? 1) + 1;
      current.splice(existingIndex, 1, updated);
    } else {
      current.push({ ...newEntry, count: 1 });
    }

    current.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
    const limited = current.slice(0, 10);

    localStorage.setItem(TOP_KEY, JSON.stringify(limited));
  }

  // --- Saved Routes ---
  private loadSavedRoutes(): SavedRoute[] {
    try {
      const json = localStorage.getItem(SAVED_KEY);
      return json ? (JSON.parse(json) as SavedRoute[]) : [];
    } catch {
      return [];
    }
  }

  saveCurrentRoute(): void {
    const route = this.currentRouteResult();
    if (!route) return;

    const all = [...this.savedRoutesSignal()];
    const withId: SavedRoute = { ...route, id: crypto.randomUUID() };
    all.push(withId);

    this.savedRoutesSignal.set(all);
    localStorage.setItem(SAVED_KEY, JSON.stringify(all));
  }

  removeSavedRoute(id: string): void {
    const filtered = this.savedRoutesSignal().filter(r => r.id !== id);
    this.savedRoutesSignal.set(filtered);
    localStorage.setItem(SAVED_KEY, JSON.stringify(filtered));
  }

  saveFromTopSearch(entry: TopSearchEntry): void {
    const all = [...this.savedRoutesSignal()];

    const routeName = `${entry.start} → ${entry.destination}`;
    const newRoute: SavedRoute = {
      id: crypto.randomUUID(),
      name: routeName,
      geometry: { type: 'FeatureCollection', features: [] }, // noch keine echte Route geladen
      distanceMeters: 0,
      durationSeconds: 0,
      start: entry.start,
      destination: entry.destination,
      profile: entry.profile as OrsProfile,
    };

    all.push(newRoute);
    this.savedRoutesSignal.set(all);
    localStorage.setItem(SAVED_KEY, JSON.stringify(all));
  }
}
