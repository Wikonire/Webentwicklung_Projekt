import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapComponent } from './map.component';
import { RouteFeatureCollection } from '../../models/route-feature-collection.model';

jest.mock('leaflet', () => {
  const geoJsonLayerMock = {
    addTo: jest.fn().mockReturnThis(),
    getBounds: jest.fn().mockReturnValue({
      isValid: () => true,
    }),
  };

  return {
    map: jest.fn().mockReturnValue({
      removeLayer: jest.fn(),
      fitBounds: jest.fn(),
    }),
    tileLayer: jest.fn().mockReturnValue({ addTo: jest.fn() }),
    geoJSON: jest.fn().mockReturnValue(geoJsonLayerMock),
  };
});

import * as Leaflet from 'leaflet';
describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;

  let mapMock: any;
  let geoJsonLayerMock: any;

  beforeEach(async () => {
    geoJsonLayerMock = {
      addTo: jest.fn().mockReturnThis(),
      getBounds: jest.fn().mockReturnValue({
        isValid: () => true,
      }),
    };

    mapMock = {
      removeLayer: jest.fn(),
      fitBounds: jest.fn(),
    };

    jest.spyOn(Leaflet, 'map').mockReturnValue(mapMock as any);
    jest.spyOn(Leaflet, 'tileLayer').mockReturnValue({ addTo: jest.fn() } as any);
    jest.spyOn(Leaflet, 'geoJSON').mockReturnValue(geoJsonLayerMock);

    await TestBed.configureTestingModule({
      imports: [MapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize Leaflet map on ngAfterViewInit', () => {
    component.ngAfterViewInit();
    expect(Leaflet.map).toHaveBeenCalled();
    expect(Leaflet.tileLayer).toHaveBeenCalled();
  });

  it('should render route when geoJsonRouteData is set after init', () => {
    component.ngAfterViewInit();

    const fakeGeoJson: RouteFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[8.5, 47.3], [8.6, 47.4]] },
          properties: {},
        },
      ],
    };

    (component as any).renderRouteOnMap(fakeGeoJson);

    expect(Leaflet.geoJSON).toHaveBeenCalledWith(fakeGeoJson, expect.any(Object));
    expect(mapMock.fitBounds).toHaveBeenCalled();
  });

  it('should clear previous route layer before rendering a new one', () => {
    component.ngAfterViewInit();

    const fakeGeoJson: RouteFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };

    (component as any).renderRouteOnMap(fakeGeoJson);
    (component as any).renderRouteOnMap(fakeGeoJson);

    // clearRouteLayer wurde aufgerufen
    expect(mapMock.removeLayer).toHaveBeenCalled();
  });
});
