import {RouteFeatureCollection} from './route-feature-collection.model';
export interface RouteResult {
  start?: string;
  destination?: string;
  name: string;
  geometry: RouteFeatureCollection;
  distanceMeters: number;
  durationSeconds: number;
}
