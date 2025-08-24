import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateRouteDto {
  userId: string;
  name?: string;
  startLat: number; startLng: number;
  endLat: number;   endLng: number;
  distance?: number; duration?: number;
  geometry: any; // GeoJSON (Feature oder Geometry)
}
export interface RouteRecord extends CreateRouteDto {
  id: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class RoutesService {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) {}

  list(userId: string): Observable<RouteRecord[]> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<RouteRecord[]>(`${this.base}/routes`, { params });
  }

  create(dto: CreateRouteDto): Observable<RouteRecord> {
    return this.http.post<RouteRecord>(`${this.base}/routes`, dto);
  }

  get(id: string, userId: string): Observable<RouteRecord> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<RouteRecord>(`${this.base}/routes/${id}`, { params });
  }

  delete(id: string, userId: string): Observable<void> {
    const params = new HttpParams().set('userId', userId);
    return this.http.delete<void>(`${this.base}/routes/${id}`, { params });
  }
}
