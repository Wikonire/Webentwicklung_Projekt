import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopRoutesComponent } from './top-routes.component';
import { RouteStore } from '../../services/route-store.service';
import { TopSearchEntry } from '../../models/routes.model';
import now = jest.now;

describe('TopRoutesComponent', () => {
  let component: TopRoutesComponent;
  let fixture: ComponentFixture<TopRoutesComponent>;
  let storeServiceMock: {
    saveFromTopSearch: jest.Mock;
    clearTopSearches: jest.Mock;
  };

  const now = new Date();
  const mockEntry: TopSearchEntry = {
    id: '123',
    startLabel: 'Bern',
    destinationLabel: 'Zürich',
    profile: 'driving-car',
    startCoord: [7.4474, 46.9481],
    destinationCoord: [8.5417, 47.3769],
    count: 5,
    timestamp:now
  };

  beforeEach(async () => {
    storeServiceMock = {
      saveFromTopSearch: jest.fn(),
      clearTopSearches: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TopRoutesComponent],
      providers: [{ provide: RouteStore, useValue: storeServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(TopRoutesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('save()', () => {
    it('should call storeService.saveFromTopSearch when coords exist', () => {
      component.save(mockEntry);
      expect(storeServiceMock.saveFromTopSearch).toHaveBeenCalledWith(mockEntry);
    });

    it('should NOT call storeService.saveFromTopSearch when coords are missing', () => {
      const invalidEntry = { ...mockEntry, startCoord: undefined } as any;
      component.save(invalidEntry);
      expect(storeServiceMock.saveFromTopSearch).not.toHaveBeenCalled();
    });
  });

  describe('clear()', () => {
    it('should call storeService.clearTopSearches', () => {
      component.clear();
      expect(storeServiceMock.clearTopSearches).toHaveBeenCalled();
    });
  });

  describe('@Input topRoutes', () => {
    it('should accept topRoutes input', () => {
      component.topRoutes = [mockEntry];
      expect(component.topRoutes.length).toBe(1);
      expect(component.topRoutes[0].startLabel).toBe('Bern');
    });
  });
});
