
export interface RouteFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'LineString'; coordinates: [number, number][] };
    properties?: {
      summary?: { distance?: number; duration?: number };
      [key: string]: unknown;
    };
  }>;
}
