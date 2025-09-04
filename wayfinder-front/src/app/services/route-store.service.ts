import {computed, Injectable, signal} from '@angular/core';
import {RouteResult} from '../models/route-result.model';



@Injectable({ providedIn: 'root' })
export class RouteStore {
  private currentRouteResultSignal = signal<RouteResult | null>(null);

  routeResult = computed(() => this.currentRouteResultSignal());
  routeGeoJson = computed(() => this.currentRouteResultSignal()?.geometry ?? null);

  setComputedRoute(newRouteResult: RouteResult): void {
    this.currentRouteResultSignal.set(newRouteResult);
  }

  clearCurrentRoute(): void {
    this.currentRouteResultSignal.set(null);
  }
}
