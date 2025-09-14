import { TestBed } from '@angular/core/testing';
import { DisplayRouteService } from './display-route.service';
import { AppRoute } from '../models/routes.model';
import { OrsProfile, profiles } from '../models/ors-profile.model';

describe('DisplayRouteService', () => {
  let service: DisplayRouteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DisplayRouteService);
  });

  describe('displayRoute()', () => {
    it('should format start and destination labels with arrow', () => {
      const mockRoute = {
        startLabel: 'Bern',
        destinationLabel: 'Zürich',
      } as AppRoute;

      const result = service.displayRoute(mockRoute);
      expect(result).toBe('Bern  →  Zürich');
    });
  });

  describe('getProfileIcon()', () => {
    it('should return icon for a known profile', () => {
      const knownProfile: OrsProfile = profiles[0].value; // z.B. "driving-car"
      const expectedIcon = profiles[0].icon;

      const result = service.getProfileIcon(knownProfile);
      expect(result).toBe(expectedIcon);
    });

    it('should return "help_outline" for unknown profile', () => {
      const result = service.getProfileIcon('unknown-profile' as OrsProfile);
      expect(result).toBe('help_outline');
    });
  });

  describe('getProfileLabel()', () => {
    it('should return label for a known profile', () => {
      const knownProfile: OrsProfile = profiles[0].value;
      const expectedLabel = profiles[0].label;

      const result = service.getProfileLabel(knownProfile);
      expect(result).toBe(expectedLabel);
    });

    it('should return "help_outline" for unknown profile', () => {
      const result = service.getProfileLabel('invalid' as OrsProfile);
      expect(result).toBe('help_outline');
    });
  });
});
