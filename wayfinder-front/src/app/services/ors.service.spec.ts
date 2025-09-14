import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrsService, Suggestion } from './ors.service';
import { OrsProfile } from '../models/ors-profile.model';
import {HttpErrorResponse, provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
import {LngLat} from '../models/routes.model';

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
        suggestions: [
          { label: 'Zürich, Schweiz', coord: [8.5417, 47.3769] },
          { label: 'Zürich HB', coord: [8.5402, 47.3782] },
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
    it('should map FeatureCollection to AppRoute with distance and duration', (done) => {
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

      jest.spyOn(global.crypto, 'randomUUID').mockReturnValue(`x-x-x-x-x`);

      orsService
        .directionsAsRouteResult(startCoordinates, destinationCoordinates, 'driving-car', 'Start', 'Ziel')
        .subscribe((routeResult) => {
          expect(routeResult).toEqual({
            id: 'mocked-uuid',
            startLabel: 'Start',
            destinationLabel: 'Ziel',
            profile: 'driving-car',
            startCoord: startCoordinates,
            destinationCoord: destinationCoordinates,
            geometry: featureCollectionPayload,
            distance: 1234,
            duration: 56,
          });
          done();
        });

      const req = httpMock.expectOne(() => true);
      req.flush(featureCollectionPayload);
    });



    it('should propagate error when HTTP request fails', (done) => {
      orsService
        .directionsAsRouteResult([0, 0], [0, 0], 'driving-car', 'Start', 'Ziel')
        .subscribe({
          next: () => fail('expected an error, not a result'),
          error: (err) => {
            expect(err).toBeInstanceOf(HttpErrorResponse);
            done();
          },
        });

      const req = httpMock.expectOne(() => true);
      req.error(new ErrorEvent('NetworkError'));
    });
     });
  describe('OrsService extra cases', () => {
    describe('autocomplete()', () => {
      it('should return [] immediately if query is empty string', (done) => {
        orsService.autocomplete('   ').subscribe((result) => {
          expect(result).toEqual([]);
          done();
        });
        httpMock.expectNone(() => true);
      });

      it('should return [] if backend returns no suggestions array', (done) => {
        orsService.autocomplete('x').subscribe((result) => {
          expect(result).toEqual([]);
          done();
        });
        const req = httpMock.expectOne(() => true);
        req.flush({}); // no suggestions
      });
    });

    describe('geocode()', () => {
      it('should return [] immediately if query is empty', (done) => {
        orsService.geocode('  ').subscribe((result) => {
          expect(result).toEqual([]);
          done();
        });
        httpMock.expectNone(() => true);
      });

      it('should map feature without label to "Unbekannt"', (done) => {
        const payload = { features: [{ id: '1', geometry: { coordinates: [1, 2] } }] };
        orsService.geocode('foo').subscribe((result) => {
          expect(result[0].label).toBe('Unbekannt');
          done();
        });
        const req = httpMock.expectOne(() => true);
        req.flush(payload);
      });

      it('should map feature without coordinates to NaN values', (done) => {
        const payload = { features: [{ id: '2', properties: { label: 'X' }, geometry: {} }] };
        orsService.geocode('foo').subscribe((result) => {
          expect(result[0].coord).toEqual([NaN, NaN]);
          done();
        });
        const req = httpMock.expectOne(() => true);
        req.flush(payload);
      });
    });

    describe('directionsFeatureCollection()', () => {
      it('should return null if response has no routes and no type', (done) => {
        orsService.directionsFeatureCollection([0,0],[1,1]).subscribe((res) => {
          expect(res).toBeNull();
          done();
        });
        const req = httpMock.expectOne(() => true);
        req.flush({});
      });

      it('should return null if route has no geometry', (done) => {
        orsService.directionsFeatureCollection([0,0],[1,1]).subscribe((res) => {
          expect(res).toBeNull();
          done();
        });
        const req = httpMock.expectOne(() => true);
        req.flush({ routes: [{}] });
      });
    });

    describe('directionsAsRouteResult()', () => {
      it('should return distance=0 and duration=0 if summary missing', (done) => {
        const payload = {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }]
        };
        orsService.directionsAsRouteResult([0,0],[1,1],'driving-car','s','d').subscribe((res) => {
          expect(res.distance).toBe(0);
          expect(res.duration).toBe(0);
          done();
        });
        const req = httpMock.expectOne(() => true);
        req.flush(payload);
      });

      it('should fallback to empty geometry and 0 values if response not FeatureCollection', (done) => {
        const payload = { foo: 'bar' };
        orsService.directionsAsRouteResult([0,0],[1,1],'cycling-mountain','a','b').subscribe((res) => {
          expect(res?.geometry?.features.length).toBe(0);
          expect(res.distance).toBe(0);
          expect(res.duration).toBe(0);
          done();
        });
        const req = httpMock.expectOne(() => true);
        req.flush(payload);
      });
    });
  });
});
