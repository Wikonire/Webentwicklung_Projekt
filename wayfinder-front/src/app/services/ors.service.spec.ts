import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrsService, Suggestion, LngLat } from './ors.service';
import { OrsProfile } from '../models/ors-profile.model';
import {provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';

describe('OrsService', () => {
  let orsService: OrsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    orsService = TestBed.inject(OrsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('autocomplete()', () => {
    it('should call /ors/autocomplete with query parameter and map suggestions', (done) => {
      const searchText = 'zurich';
      const expectedUrl = `http://localhost:3000/ors/autocomplete`;

      const backendPayload = {
        features: [
          {
            properties: { label: 'Zürich, Schweiz' },
            geometry: { coordinates: [8.5417, 47.3769] },
          },
          {
            properties: { name: 'Zürich HB' },
            geometry: { coordinates: [8.5402, 47.3782] },
          },
        ],
      };

      orsService.autocomplete(searchText).subscribe((resultSuggestions: Suggestion[]) => {
        expect(resultSuggestions).toEqual([
          { label: 'Zürich, Schweiz', coord: [8.5417, 47.3769] },
          { label: 'Zürich HB', coord: [8.5402, 47.3782] },
        ]);
        done();
      });

      const req = httpMock.expectOne(r => r.method === 'GET' && r.url === expectedUrl);
      expect(req.request.params.get('query')).toBe(searchText);
      req.flush(backendPayload);
    });

    it('should return empty array on error', (done) => {
      orsService.autocomplete('boom').subscribe((resultSuggestions) => {
        expect(resultSuggestions).toEqual([]);
        done();
      });

      const req = httpMock.expectOne(() => true);
      req.error(new ErrorEvent('NetworkError'));
    });
  });

  describe('geocode()', () => {
    it('should call /ors/geocode and map to suggestions', (done) => {
      const expectedUrl = `http://localhost:3000/ors/geocode`;
      const searchText = 'bern';

      const backendPayload = {
        features: [
          {
            properties: { label: 'Bern, Schweiz' },
            geometry: { coordinates: [7.4474, 46.9481] },
          },
        ],
      };

      orsService.geocode(searchText).subscribe((resultSuggestions) => {
        expect(resultSuggestions).toEqual([
          { label: 'Bern, Schweiz', coord: [7.4474, 46.9481] },
        ]);
        done();
      });

      const req = httpMock.expectOne(
        r => r.method === 'GET' && r.url === expectedUrl
      );
      expect(req.request.params.get('query')).toBe(searchText);
      req.flush(backendPayload);
    });

    it('should return empty array on error', (done) => {
      orsService.geocode('err').subscribe((resultSuggestions) => {
        expect(resultSuggestions).toEqual([]);
        done();
      });

      const req = httpMock.expectOne(() => true);
      req.error(new ErrorEvent('NetworkError'));
    });
  });

  describe('directionsFeatureCollection()', () => {
    it('should return FeatureCollection when backend already returns GeoJSON FeatureCollection', (done) => {
      const startCoordinates: LngLat = [8.54, 47.37];
      const destinationCoordinates: LngLat = [7.44, 46.94];
      const expectedUrl = `http://localhost:3000/ors/directions`;

      const backendPayload = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[8.54, 47.37], [7.44, 46.94]] },
            properties: { summary: { distance: 1000, duration: 120 } },
          },
        ],
      };

      orsService
        .directionsFeatureCollection(startCoordinates, destinationCoordinates, 'driving-car')
        .subscribe((featureCollection) => {
          expect(featureCollection).toEqual(backendPayload);
          done();
        });

      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        start: startCoordinates,
        end: destinationCoordinates,
        profile: 'driving-car',
      });
      req.flush(backendPayload);
    });

    it('should transform legacy response with routes[0].geometry into FeatureCollection', (done) => {
      const startCoordinates: LngLat = [8, 47];
      const destinationCoordinates: LngLat = [7, 46];

      const legacyBackendPayload = {
        routes: [
          {
            geometry: { type: 'LineString', coordinates: [[8, 47], [7, 46]] },
            summary: { distance: 2500, duration: 300 },
          },
        ],
      };

      orsService
        .directionsFeatureCollection(startCoordinates, destinationCoordinates)
        .subscribe((featureCollection) => {
          expect(featureCollection).toEqual({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [[8, 47], [7, 46]] },
                properties: { summary: { distance: 2500, duration: 300 } },
              },
            ],
          });
          done();
        });

      const req = httpMock.expectOne(() => true);
      req.flush(legacyBackendPayload);
    });

    it('should return null on error', (done) => {
      orsService
        .directionsFeatureCollection([0, 0], [1, 1], 'cycling-regular' as OrsProfile)
        .subscribe((featureCollection) => {
          expect(featureCollection).toBeNull();
          done();
        });

      const req = httpMock.expectOne(() => true);
      req.error(new ErrorEvent('NetworkError'));
    });
  });

  describe('directionsAsRouteResult()', () => {
    it('should map FeatureCollection to RouteResult with meters and seconds', (done) => {
      const startCoordinates: LngLat = [8.1, 47.1];
      const destinationCoordinates: LngLat = [8.2, 47.2];

      const featureCollectionPayload = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[8.1, 47.1], [8.2, 47.2]] },
            properties: { summary: { distance: 1234, duration: 56 } },
          },
        ],
      };

      orsService
        .directionsAsRouteResult(startCoordinates, destinationCoordinates, 'driving-car')
        .subscribe((routeResult) => {
          expect(routeResult).toEqual({
            name: '8.1, 47.1 → 8.2, 47.2',
            geometry: featureCollectionPayload,
            distanceMeters: 1234,
            durationSeconds: 56,
          });
          done();
        });

      const req = httpMock.expectOne(() => true);
      req.flush(featureCollectionPayload);
    });

    it('should return null RouteResult when FeatureCollection is null', (done) => {
      orsService
        .directionsAsRouteResult([0, 0], [0, 0])
        .subscribe((routeResult) => {
          expect(routeResult).toBeNull();
          done();
        });

      const req = httpMock.expectOne(() => true);
      req.error(new ErrorEvent('NetworkError'));
    });
  });
});
