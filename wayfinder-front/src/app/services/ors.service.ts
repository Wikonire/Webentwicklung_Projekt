import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export type LngLat = [number, number];

export interface Suggestion {
  label: string;
  coord: LngLat;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: LngLat[];
}

@Injectable({ providedIn: 'root' })
export class OrsService {
  private api = environment.apiBaseUrl.replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  autocomplete(query: string): Observable<Suggestion[]> {
    const params = new HttpParams().set('query', query);   // statt q
    return this.http.get<any>(`${this.api}/ors/autocomplete`, { params }).pipe(
      map(res =>
        (res?.features ?? []).map((f: any) => ({
          label: f?.properties?.label ?? f?.properties?.name ?? 'Unbekannt',
          coord: [f?.geometry?.coordinates?.[0], f?.geometry?.coordinates?.[1]] as LngLat,
        }))
      ),
      catchError(() => of([]))
    );
  }

  geocode(query: string): Observable<Suggestion[]> {
    const params = new HttpParams().set('query', query);   // statt q
    return this.http.get<any>(`${this.api}/ors/geocode`, { params }).pipe(
      map(res =>
        (res?.features ?? []).map((f: any) => ({
          label: f?.properties?.label ?? f?.properties?.name ?? 'Unbekannt',
          coord: [f?.geometry?.coordinates?.[0], f?.geometry?.coordinates?.[1]] as LngLat,
        }))
      ),
      catchError(() => of([]))
    );
  }

  directions(start: LngLat, end: LngLat, profile: string = 'driving-car'): Observable<RouteGeometry | null> {
    return this.http.post<any>(`${this.api}/ors/directions`, { start, end, profile }).pipe(
      map(res => {
        if (res?.type === 'FeatureCollection') {
          return res.features?.[0]?.geometry ?? null;
        }
        const route = res?.routes?.[0];
        return route?.geometry ?? null;
      }),
      catchError(() => of(null))
    );
  }
}
