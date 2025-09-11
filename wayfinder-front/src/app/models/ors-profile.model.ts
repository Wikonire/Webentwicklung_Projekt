export type OrsProfile =
  | 'driving-car' | 'driving-hgv'
  | 'cycling-regular' | 'cycling-road' | 'cycling-mountain' | 'cycling-electric'
  | 'foot-walking' | 'foot-hiking'
  | 'wheelchair';

export const profiles: Array<{ value: OrsProfile; label: string; icon: string }> = [
  { value: 'driving-car', label: 'Auto', icon: 'directions_car' },
  { value: 'driving-hgv', label: 'LKW', icon: 'local_shipping' },
  { value: 'cycling-regular', label: 'Fahrrad', icon: 'directions_bike' },
  { value: 'cycling-road', label: 'Rennrad', icon: 'pedal_bike' },
  { value: 'cycling-mountain', label: 'Mountainbike', icon: 'terrain' },
  { value: 'cycling-electric', label: 'E-Bike', icon: 'electric_bike' },
  { value: 'foot-walking', label: 'Zu Fuss', icon: 'directions_walk' },
  { value: 'foot-hiking', label: 'Wandern', icon: 'hiking' },
  { value: 'wheelchair', label: 'Rollstuhl', icon: 'accessible' },
];
