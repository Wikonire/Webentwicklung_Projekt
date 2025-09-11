import {RouteFeatureCollection} from './route-feature-collection.model';
import {OrsProfile} from './ors-profile.model';

export type LngLat = [number, number];
export interface AppRoute {
  id: string;
  name: string;
  start: string;
  destination: string;
  profile: OrsProfile;

  startCoord?: LngLat;
  destinationCoord?: LngLat;

  geometry?: RouteFeatureCollection;
  distanceMeters?: number;
  durationSeconds?: number;

  count?: number;
}

export interface TopSearchEntry {
  timestamp: Date;
  id: string;
  start: string;
  destination: string;
  profile: OrsProfile;
  startCoord?: LngLat;
  destinationCoord?: LngLat;
  count?: number;
}
