import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { RouteFeatureCollection } from '../models/route-feature-collection.model';
import { OrsProfile } from '../models/ors-profile.model';
import { AppRoute, LngLat } from '../models/routes.model';

export interface Suggestion {
  id: number | string;
  label: string;
  coord: LngLat;
}

interface GeocodeResponse {
  features: Array<{
    id: string | number;
    properties?: { label?: string };
    geometry?: { coordinates?: [number, number] };
  }>;
}

interface AutocompleteResponse {
  suggestions: Suggestion[];
}

interface DirectionsSummary {
  distance?: number;
  duration?: number;
}

interface DirectionsRoute {
  geometry: any; //  Polyline oder GeoJSON LineString
  summary?: DirectionsSummary;
}

interface DirectionsResponse {
  type?: string;
  features?: any[];
  routes?: DirectionsRoute[];
}

@Injectable({ providedIn: 'root' })
export class OrsService {
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  constructor(private httpClient: HttpClient) {}

  /** Autocomplete nach ORS (Proxy: GET /ors/autocomplete?query=...) */
  autocomplete(searchText: string): Observable<Suggestion[]> {
    const trimmed = (searchText ?? '').trim();
    if (!trimmed) return of([]);

    const httpParams = new HttpParams().set('query', trimmed);

    return this.httpClient
      .get<AutocompleteResponse>(`${this.apiBaseUrl}/ors/autocomplete`, { params: httpParams })
      .pipe(
        map(({ suggestions }) => (Array.isArray(suggestions) ? suggestions : [])),
        catchError(() => {
          return of([]);
        })
      );
  }

  /** Forward Geocoding via Proxy: GET /ors/geocode?query=... */
  geocode(searchText: string): Observable<Suggestion[]> {
    const trimmed = (searchText ?? '').trim();
    if (!trimmed) return of([]);

    const httpParams = new HttpParams().set('query', trimmed);

    return this.httpClient
      .get<GeocodeResponse>(`${this.apiBaseUrl}/ors/geocode`, { params: httpParams })
      .pipe(
        map(({ features }) =>
          (features ?? []).map(
            (feature): Suggestion => ({
              id: feature.id,
              label: feature?.properties?.label ?? 'Unbekannt',
              coord: [
                Number(feature?.geometry?.coordinates?.[0]),
                Number(feature?.geometry?.coordinates?.[1]),
              ] as LngLat,
            })
          )
        ),
        catchError(error => {
          console.error('Geocode error:', error);
          return of([]);
        })
      );
  }

  /**
   * Komfort-Methode: baut eine fertige AppRoute (inklusive GeoJSON, Distanz, Dauer).
   */
  directionsAsRouteResult(
    startCoord: LngLat,
    destinationCoord: LngLat,
    profile: OrsProfile,
    startLabel: string,
    destinationLabel: string
  ): Observable<AppRoute> {
    return this.httpClient
      .post<DirectionsResponse>(`${this.apiBaseUrl}/ors/directions`, {
        start: startCoord,
        end: destinationCoord,
        profile,
      })
      .pipe(
        map(res => {
          let geometry: RouteFeatureCollection = { type: 'FeatureCollection', features: [] };
          let distance = 0;
          let duration = 0;

          if (res?.type === 'FeatureCollection') {
            geometry = res as RouteFeatureCollection;

            const summary = geometry.features?.[0]?.properties?.summary;
            if (summary) {
              distance = summary.distance ?? 0;
              duration = summary.duration ?? 0;
            }
          }

          return {
            id: crypto.randomUUID(),
            startLabel,
            destinationLabel,
            profile,
            startCoord,
            destinationCoord,
            geometry,
            distance,
            duration,
          } as AppRoute;
        })
      );
  }



  /**
   * Directions als FeatureCollection.
   * POST-Body: { start: [lon,lat], end: [lon,lat], profile: 'driving-car' }
   */
  directionsFeatureCollection(
    start: LngLat,
    end: LngLat,
    profile: OrsProfile = 'driving-car'
  ): Observable<RouteFeatureCollection | null> {
    return this.httpClient
      .post<DirectionsResponse>(`${this.apiBaseUrl}/ors/directions`, { start, end, profile })
      .pipe(
        map(res => {
          if (res?.type === 'FeatureCollection') {
            return res as RouteFeatureCollection;
          }

          const route = res?.routes?.[0];
          if (route?.geometry) {
            return {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: route.geometry,
                  properties: { summary: route.summary ?? {} },
                },
              ],
            } as RouteFeatureCollection;
          }

          return null;
        }),
        catchError(error => {
          console.error('DirectionsFeatureCollection error:', error);
          return of(null);
        })
      );
  }
}
