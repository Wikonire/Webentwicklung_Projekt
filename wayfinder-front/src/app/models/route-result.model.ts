import {RouteFeatureCollection} from './route-feature-collection.model';
import {OrsProfile} from './ors-profile.model';
export interface RouteResult {
  start?: string;
  destination?: string;
  name: string;
  geometry: RouteFeatureCollection;
  distanceMeters: number;
  durationSeconds: number;
}


export interface SavedRoute extends RouteResult {
  id: string;
  profile?: OrsProfile;
}
