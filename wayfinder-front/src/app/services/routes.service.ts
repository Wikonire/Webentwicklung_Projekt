import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppRoute } from '../models/routes.model';

@Injectable({ providedIn: 'root' })
export class RoutesService {
  private api = `${environment.apiBaseUrl}/routes`;

  constructor(private http: HttpClient) {}

  /** alle gespeicherten Routen laden */
  list(): Observable<AppRoute[]> {
    return this.http.get<AppRoute[]>(this.api);
  }

  /** einzelne Route laden */
  getOne(id: string): Observable<AppRoute> {
    return this.http.get<AppRoute>(`${this.api}/${id}`);
  }

  /** neue Route speichern */
  save(route: AppRoute): Observable<AppRoute> {
    const newRoute = {
      userId: 'u1',
      startLabel: route.startLabel,
      destinationLabel: route.destinationLabel,
      startCoord: route.startCoord,             // [lon, lat]
      destinationCoord: route.destinationCoord, // [lon, lat]
      profile: route.profile,
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry
    };

    return this.http.post<AppRoute>(this.api, newRoute);
  }

  /** Route löschen */
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
