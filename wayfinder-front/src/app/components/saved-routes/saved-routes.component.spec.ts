import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SavedRoutesComponent } from './saved-routes.component';
import { RouteStore } from '../../services/route-store.service';
import { OrsProfile, profiles } from '../../models/ors-profile.model';
import { AppRoute } from '../../models/routes.model';

// Dummy AppRoute für Tests
const mockRoute: AppRoute = {
  id: '1',
  startLabel: 'Bern',
  destinationLabel: 'Zürich',
  startCoord: [7.4474, 46.9481],
  destinationCoord: [8.5417, 47.3769],
  profile: 'driving-car' as OrsProfile,
  geometry: { type: 'FeatureCollection', features: [] },
  distance: 1000,
  duration: 100,
};

describe('SavedRoutesComponent', () => {
  let component: SavedRoutesComponent;
  let fixture: ComponentFixture<SavedRoutesComponent>;
  let routeStoreMock: { removeSavedRoute: jest.Mock };

  beforeEach(async () => {
    routeStoreMock = {
      removeSavedRoute: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SavedRoutesComponent],
      providers: [{ provide: RouteStore, useValue: routeStoreMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(SavedRoutesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getProfileIcon()', () => {
    it('should return icon for known profile', () => {
      const result = component.getProfileIcon(profiles[0].value);
      expect(result).toBe(profiles[0].icon);
    });

    it('should return help_outline for unknown profile', () => {
      const result = component.getProfileIcon('unknown' as OrsProfile);
      expect(result).toBe('help_outline');
    });
  });

  describe('getProfileLabel()', () => {
    it('should return label for known profile', () => {
      const result = component.getProfileLabel(profiles[0].value);
      expect(result).toBe(profiles[0].label);
    });

    it('should return help_outline for unknown profile', () => {
      const result = component.getProfileLabel('invalid' as OrsProfile);
      expect(result).toBe('help_outline');
    });
  });

  describe('remove()', () => {
    it('should call routeStore.removeSavedRoute with id', () => {
      component.remove('123');
      expect(routeStoreMock.removeSavedRoute).toHaveBeenCalledWith('123');
    });
  });

  describe('toMap()', () => {
    it('should emit showRoute event with id and profile', () => {
      jest.spyOn(component.showRoute, 'emit');
      component.toMap('1', 'cycling-regular' as OrsProfile);
      expect(component.showRoute.emit).toHaveBeenCalledWith({
        id: '1',
        profile: 'cycling-regular',
      });
    });
  });

  describe('@Input savedRoutes', () => {
    it('should accept savedRoutes input', () => {
      component.savedRoutes = [mockRoute];
      expect(component.savedRoutes.length).toBe(1);
      expect(component.savedRoutes[0].startLabel).toBe('Bern');
    });
  });
});
