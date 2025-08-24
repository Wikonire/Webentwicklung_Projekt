import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrsService {
  private api = environment.apiBaseUrl; // Express-API

  constructor(private http: HttpClient) {}


  autocomplete(q: string): Observable<{ label: string; coord: [number, number] }[]> {
    const params = new HttpParams().set('q', q);
    return this.http.get<any>(`${this.api}/ors/autocomplete`, { params }).pipe(
      map(res =>
        // Pelias/ORS-Format -> {label, coord}
        (res?.features ?? []).map((f: any) => ({
          label: f.properties?.label ?? f.properties?.name ?? 'Unbekannt',
          coord: [f.geometry.coordinates[0], f.geometry.coordinates[1]] as [number, number],
        }))
      )
    );
  }

  // Geocode (falls du gezielt suchen willst)
  geocode(q: string) {
    const params = new HttpParams().set('q', q);
    return this.http.get(`${this.api}/ors/geocode`, { params });
  }

  // Directions: Start [lng,lat], End [lng,lat] → GeoJSON Geometry/Feature
  directions(start: [number, number], end: [number, number], profile: string = 'driving-car') {
    return this.http.post<any>(`${this.api}/ors/directions`, { start, end, profile }).pipe(
      map(res => {
        const feature = res?.features?.[0];
        return feature?.geometry ?? null;
      })
    );
  }
}
