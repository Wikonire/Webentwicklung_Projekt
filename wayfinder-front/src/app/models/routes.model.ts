import {RouteFeatureCollection} from './route-feature-collection.model';
import {OrsProfile} from './ors-profile.model';

export type LngLat = [number, number];
export interface AppRoute {
  id: string;
  startLabel: string;
  destinationLabel: string;
  profile: OrsProfile;

  startCoord?: LngLat;
  destinationCoord?: LngLat;

  geometry?: RouteFeatureCollection;
  distance?: number;
  duration?: number;
  userId?: string;
  count?: number;
}

export interface TopSearchEntry {
  timestamp: Date;
  id: string;
  startLabel: string;
  destinationLabel: string;
  profile: OrsProfile;
  startCoord?: LngLat;
  destinationCoord?: LngLat;
  count?: number;
}
