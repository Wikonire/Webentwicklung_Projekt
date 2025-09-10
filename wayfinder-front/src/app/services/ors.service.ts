import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { RouteFeatureCollection } from '../models/route-feature-collection.model';
import { RouteResult } from '../models/route-result.model';
import {OrsProfile} from '../models/ors-profile.model';

export type LngLat = [number, number];

export interface Suggestion {
  id: number;
  label: string;
  coord: LngLat;
}

@Injectable({ providedIn: 'root' })
export class OrsService {
  private apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  constructor(private httpClient: HttpClient) {
  }

  /** Autocomplete nach ORS (Proxy: GET /ors/autocomplete?query=...) */
  autocomplete(searchText: string): Observable<Suggestion[]> {
    const trimmed = (searchText ?? '').trim();
    if (!trimmed) return of([]);
    const httpParams = new HttpParams().set('query', trimmed);
    return this.httpClient.get<{
      suggestions: Suggestion[]
    }>(`${this.apiBaseUrl}/ors/autocomplete`, {params: httpParams}).pipe(
      map(response => Array.isArray(response?.suggestions) ? response.suggestions : []),
      catchError(() => of([]))
    );
  }


  /** Forward Geocoding via Proxy: GET /ors/geocode?query=...  (optional gleicher Mapper) */
  geocode(searchText: string): Observable<Suggestion[]> {
    const httpParams = new HttpParams().set('query', searchText);
    return this.httpClient.get<any>(`${this.apiBaseUrl}/ors/geocode`, {params: httpParams}).pipe(
      map((rawResponse: any) => {
        const features: any[] = rawResponse?.features ?? [];
        return features.map((feature: any): Suggestion => ({
          id: feature.id,
          label: feature?.properties?.label,
          coord: [
            feature?.geometry?.coordinates?.[0],
            feature?.geometry?.coordinates?.[1],
          ] as LngLat,
        }));
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Directions als FeatureCollection.
   * POST-Body: { start: [lon,lat], end: [lon,lat], profile: 'driving-car' }
   */
  directionsFeatureCollection(
    startCoordinates: LngLat,
    destinationCoordinates: LngLat,
    profile: OrsProfile = 'driving-car'
  ): Observable<RouteFeatureCollection | null> {
    return this.httpClient
      .post<RouteFeatureCollection | any>(`${this.apiBaseUrl}/ors/directions`, {
        start: startCoordinates,
        end: destinationCoordinates,
        profile
      })
      .pipe(
        map((rawResponse: any) => {
          // Falls der Proxy bereits GeoJSON liefert (FeatureCollection)
          if (rawResponse?.type === 'FeatureCollection') {
            return rawResponse as RouteFeatureCollection;
          }
          // Fallback: altes JSON-Format in FeatureCollection umwandeln (falls nötig)
          const lineString = rawResponse?.routes?.[0]?.geometry;
          if (lineString?.type === 'LineString' && Array.isArray(lineString.coordinates)) {
            const featureCollection: RouteFeatureCollection = {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: lineString,
                  properties: {summary: rawResponse?.routes?.[0]?.summary ?? {}}
                }
              ]
            };
            return featureCollection;
          }
          return null;
        }),
        catchError(() => of(null))
      );
  }

  /**
   * Komfort-Methode: baut ein fertiges RouteResult (für Store/Map).
   */
  directionsAsRouteResult(
    startCoordinates: LngLat,
    destinationCoordinates: LngLat,
    profile: OrsProfile = 'driving-car',
    startLabel?: string,
    destinationLabel?: string
  ): Observable<RouteResult | null> {
    // Falls Labels vorhanden → die nehmen, sonst Koordinaten
    const routeName = startLabel && destinationLabel
      ? `${startLabel} → ${destinationLabel}`
      : `${startCoordinates.join(', ')} → ${destinationCoordinates.join(', ')}`;

    return this.directionsFeatureCollection(startCoordinates, destinationCoordinates, profile).pipe(
      map((featureCollection: RouteFeatureCollection | null) => {
        if (!featureCollection) return null;

        const firstFeature = featureCollection.features?.[0];
        const distanceMeters = firstFeature?.properties?.summary?.distance ?? 0;
        const durationSeconds = firstFeature?.properties?.summary?.duration ?? 0;

        const routeResult: RouteResult = {
          name: routeName,
          geometry: featureCollection,
          distanceMeters,
          durationSeconds
        };
        return routeResult;
      })
    );
  }
}
