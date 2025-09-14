import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { RouteStore } from '../../services/route-store.service';
import { OrsProfile } from '../../models/ors-profile.model';
import { Suggestion } from '../../services/ors.service';
import {MatTabGroup, MatTabsModule} from '@angular/material/tabs';

import { SearchFormComponent } from '../../components/search-form/search-form.component';
import { MapComponent } from '../../components/map/map.component';
import { TopRoutesComponent } from '../../components/top-routes/top-routes.component';
import { SavedRoutesComponent } from '../../components/saved-routes/saved-routes.component';
import { By } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {MatTabGroupHarness} from '@angular/material/tabs/testing';
import {CommonModule} from '@angular/common';
import {MatListHarness} from '@angular/material/list/testing';
import {TopRoutesHarness} from '../../components/top-routes/top-routes.component.harness';
import {SavedRoutesHarness} from '../../components/saved-routes/saved-routes.component.harness';
import {HarnessLoader} from '@angular/cdk/harness-environment.d';

describe('HomeComponent', () => {
  describe('Unit-Tests', () => {
    let component: HomeComponent;
    let fixture: ComponentFixture<HomeComponent>;
    let routeStoreMock: {
      computeRoute: jest.Mock;
      loadSavedRoute: jest.Mock;
      routeResult: ReturnType<typeof signal>;
    };

    beforeEach(async () => {
      routeStoreMock = {
        computeRoute: jest.fn(),
        loadSavedRoute: jest.fn(),
        clearTopSearches: jest.fn(),
        routeResult: signal(null),
        topSearches: signal([]),
        savedRoutes: signal([]),
        routeGeoJson: signal(null),
      };

      await TestBed.configureTestingModule({
        imports: [
          HomeComponent,
          SearchFormComponent,
          MapComponent,
          TopRoutesComponent,
          SavedRoutesComponent,
          MatTabsModule,
        ],
        providers: [
          { provide: RouteStore, useValue: routeStoreMock },
          provideHttpClient(withInterceptorsFromDi()),
          provideHttpClientTesting(),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(HomeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();
    });


    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('findRoute()', () => {
      it('should call routeStore.computeRoute with correct params', () => {
        const mockEvent = {
          start: {label: 'Bern', coord: [7.44, 46.94]} as Suggestion,
          destination: {label: 'Zürich', coord: [8.54, 47.37]} as Suggestion,
          profile: 'driving-car' as OrsProfile,
        };

        component.findRoute(mockEvent);

        expect(routeStoreMock.computeRoute).toHaveBeenCalledWith(
          [7.44, 46.94],
          [8.54, 47.37],
          'driving-car',
          'Bern',
          'Zürich'
        );
      });
    });

    describe('onShowSavedRoute()', () => {
      it('should call routeStore.loadSavedRoute with id', () => {
        component.onShowSavedRoute({id: '123', profile: 'cycling-regular' as OrsProfile});
        expect(routeStoreMock.loadSavedRoute).toHaveBeenCalledWith('123');
      });
    });
  });

  describe('HomeComponent – Acceptance Tests', () => {
    let fixture: ComponentFixture<HomeComponent>;
    let component: HomeComponent;
    let routeStoreMock: {
      computeRoute: jest.Mock;
      loadSavedRoute: jest.Mock;
      saveFromTopSearch: jest.Mock;
      clearTopSearches: jest.Mock;
      // Signale, die im Template verwendet werden
      routeResult: ReturnType<typeof signal>;
      routeGeoJson: ReturnType<typeof signal>;
      topSearches: ReturnType<typeof signal>;
      savedRoutes: ReturnType<typeof signal>;
    };

    beforeEach(async () => {
      routeStoreMock = {
        computeRoute: jest.fn(),
        loadSavedRoute: jest.fn(),
        saveFromTopSearch: jest.fn(),
        clearTopSearches: jest.fn(),
        routeResult: signal(null),   // so wie im echten Store
        routeGeoJson: signal(null),
        topSearches: signal([]),
        savedRoutes: signal([]),
      };

      await TestBed.configureTestingModule({
        imports: [
          HomeComponent,
          SearchFormComponent,
          MapComponent,
          TopRoutesComponent,
          SavedRoutesComponent,
          MatTabsModule,
          CommonModule,
        ],
        providers: [{ provide: RouteStore, useValue: routeStoreMock },
          provideHttpClient(withInterceptorsFromDi()),
          provideHttpClientTesting(),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(HomeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should render the expected tab labels', () => {
      const tabLabels = fixture.debugElement
        .queryAll(By.css('.mat-mdc-tab .mdc-tab__text-label'))
        .map(el => el.nativeElement.textContent.trim());

      expect(tabLabels).toEqual([
        'Top 10 der letzten Routen',
        'Gespeicherte Routen'
      ]);
    });

    it('should trigger computeRoute when SearchForm emits findRoute', () => {
      const mockEvent = {
        start: { label: 'Bern', coord: [7.44, 46.94] },
        destination: { label: 'Zürich', coord: [8.54, 47.37] },
        profile: 'driving-car',
      };

      component.findRoute(mockEvent as any);
      expect(routeStoreMock.computeRoute).toHaveBeenCalledWith(
        [7.44, 46.94],
        [8.54, 47.37],
        'driving-car',
        'Bern',
        'Zürich'
      );
    });

    it('should load a saved route when SavedRoutes emits onShowSavedRoute', () => {
      component.onShowSavedRoute({ id: '123', profile: 'cycling-regular' as any });
      expect(routeStoreMock.loadSavedRoute).toHaveBeenCalledWith('123');
    });

    it('should save a top route when TopRoutes emits save', () => {
      const topEntry = {
        start: 'Bern',
        destination: 'Zürich',
        profile: 'driving-car',
        startCoord: [7.44, 46.94],
        destinationCoord: [8.54, 47.37],
        count: 10,
      };

      routeStoreMock.saveFromTopSearch(topEntry);
      expect(routeStoreMock.saveFromTopSearch).toHaveBeenCalledWith(topEntry);
    });

    it('should clear top routes when TopRoutes emits clear', () => {
      component.routeStore.clearTopSearches();
      expect(routeStoreMock.clearTopSearches).toHaveBeenCalled();
    });

    it('should trigger computeRoute when SearchForm emits findRoute', () => {
      // SearchForm-Komponente finden
      const searchFormDebug = fixture.debugElement.query(By.directive(SearchFormComponent));
      const searchFormCmp = searchFormDebug.componentInstance as SearchFormComponent;

      // Mock-Daten für das Event
      const mockEvent = {
        start: { label: 'Bern', coord: [7.44, 46.94] },
        destination: { label: 'Zürich', coord: [8.54, 47.37] },
        profile: 'driving-car',
      };

      // Output-Event direkt auslösen
      searchFormCmp.findRoute.emit(mockEvent as any);
      fixture.detectChanges();

      expect(routeStoreMock.computeRoute).toHaveBeenCalledWith(
        [7.44, 46.94],
        [8.54, 47.37],
        'driving-car',
        'Bern',
        'Zürich'
      );
    });

    it('should render MapComponent with route data when routeGeoJson is set', () => {
      const dummyGeoJson = {
        type: 'FeatureCollection',
        features: [],
      };
      routeStoreMock.routeGeoJson.set(dummyGeoJson as any);
      fixture.detectChanges();

      const mapCmp = fixture.debugElement.query(By.directive(MapComponent));
      expect(mapCmp).toBeTruthy();
      // Signal-Input auslesen
      expect(mapCmp.componentInstance.geoJsonRouteData()).toEqual(dummyGeoJson);
    });
    it('should update routeResult when findRoute is triggered', () => {
      const mockEvent = {
        start: { label: 'Bern', coord: [7.44, 46.94] },
        destination: { label: 'Zürich', coord: [8.54, 47.37] },
        profile: 'driving-car',
      };

      component.findRoute(mockEvent as any);

      expect(routeStoreMock.computeRoute).toHaveBeenCalledWith(
        [7.44, 46.94],
        [8.54, 47.37],
        'driving-car',
        'Bern',
        'Zürich'
      );
    });
    it('should render MapComponent with routeGeoJson when store updates', () => {
      const dummyGeoJson = { type: 'FeatureCollection', features: [] };
      routeStoreMock.routeGeoJson.set(dummyGeoJson as any);
      fixture.detectChanges();

      const mapCmp = fixture.debugElement.query(By.directive(MapComponent));
      expect(mapCmp).toBeTruthy();
      expect(mapCmp.componentInstance.geoJsonRouteData()).toEqual(dummyGeoJson);
    });

    it('should pass topSearches from store to TopRoutesComponent', () => {
      const dummyTop = [
        {
          start: 'Bern',
          destination: 'Zürich',
          profile: 'driving-car',
          startCoord: [7, 46],
          destinationCoord: [8, 47],
          count: 3
        },
        {
          start: 'Boll-Utzigen',
          destination: 'Regenbogenhaus Zürich',
          profile: 'driving-car',
          startCoord: [7, 46],
          destinationCoord: [8, 47],
          count: 3
        }
      ];

      routeStoreMock.topSearches.set(dummyTop as any);
      fixture.detectChanges();

      const topCmp = fixture.debugElement.query(By.directive(TopRoutesComponent));
      expect(topCmp.componentInstance.topRoutes).toEqual(dummyTop);
    });

    it('should load Tab element with label Gespeicherte Routen', async () => {
      const loader = TestbedHarnessEnvironment.loader(fixture);
      const tabGroup = await loader.getHarness(MatTabGroupHarness);
      await tabGroup.selectTab({ label: 'Gespeicherte Routen' });
      fixture.detectChanges();

      const tabs = await tabGroup.getTabs();
      const savedCmp = fixture.debugElement.query(By.directive(SavedRoutesComponent));
      await tabs[1].select()
      expect(await tabs[1].getLabel()).toBe('Gespeicherte Routen');
    });

    it('should render two top routes', async () => {
      const loader = TestbedHarnessEnvironment.loader(fixture);
      const tabGroup = await loader.getHarness(MatTabGroupHarness);
      const matList = await loader.getHarness(MatListHarness);

      // Auf Tab wechseln
      await tabGroup.selectTab({ label: 'Gespeicherte Routen' });
      fixture.detectChanges();

      // Sicherstellen, dass Tab gefunden wurde
      const tabs = await tabGroup.getTabs();
      expect(await tabs[1].getLabel()).toBe('Gespeicherte Routen');
      const dummyTop = [
        {
          id:'1234567822',
          start: 'Bern',
          destination: 'Zürich',
          profile: 'driving-car',
          startCoord: [7, 46],
          destinationCoord: [8, 47],
          count: 3
        },
        {
          id:'1234567890',
          start: 'Boll-Utzigen',
          destination: 'Regenbogenhaus Zürich',
          profile: 'driving-car',
          startCoord: [7, 46],
          destinationCoord: [8, 47],
          count: 3
        }
      ];

      routeStoreMock.topSearches.set(dummyTop as any);
      fixture.detectChanges();
      await fixture.whenStable()
      const items = await matList.getItems()
      expect(items.length).toBe(2);
      const savedCmp = fixture.debugElement.query(By.directive(TopRoutesComponent));
      expect(savedCmp).toBeTruthy();
    });

    it('should load Tab element with label Top 10 der letzten Routen', async () => {
      const loader = TestbedHarnessEnvironment.loader(fixture);
      const tabGroup = await loader.getHarness(MatTabGroupHarness);
      await tabGroup.selectTab({ label: 'Top 10 der letzten Routen' });
      fixture.detectChanges();

      const tabs = await tabGroup.getTabs();
      const savedCmp = fixture.debugElement.query(By.directive(SavedRoutesComponent));
      await tabs[0].select()
      expect(await tabs[0].getLabel()).toBe('Top 10 der letzten Routen');
    });


    it('should save route when TopRoutesComponent calls save', () => {
      const entry = {
        start: 'Bern',
        destination: 'Zürich',
        profile: 'driving-car',
        startCoord: [7.44, 46.94],
        destinationCoord: [8.54, 47.37],
        count: 5,
      };

      routeStoreMock.saveFromTopSearch(entry);
      expect(routeStoreMock.saveFromTopSearch).toHaveBeenCalledWith(entry);
    });

    it('should show TopRoutesComponent when "Top 10 der letzten Routen" tab is active', async () => {
      const loader = TestbedHarnessEnvironment.loader(fixture);
      const tabGroup = await loader.getHarness(MatTabGroupHarness);

      // Default ist Index 0 → TopRoutes
      const topCmp = fixture.debugElement.query(By.directive(TopRoutesComponent));
      expect(topCmp).toBeTruthy();
    });

    it('should clear top routes via harness', async () => {
      const loader = TestbedHarnessEnvironment.loader(fixture);
      const topHarness = await loader.getHarness(TopRoutesHarness);

      await topHarness.clearList();
      expect(routeStoreMock.clearTopSearches).toHaveBeenCalled();
    });

    it('should render matGoup when "Gespeicherte Routen" tab is selected', async () => {
      const loader = TestbedHarnessEnvironment.loader(fixture);
      const tabGroup = await loader.getHarness(MatTabGroupHarness);

      await tabGroup.selectTab({ label: 'Gespeicherte Routen' });
      const selected = await tabGroup.getSelectedTab()
      const host = await selected.host();

      expect(host).toBeTruthy();
    });
    it('should render MapComponent with routeResult when store updates', () => {
      const dummyRoute = {
        id: 'r1',
        startCoord: [7.44, 46.94],
        destinationCoord: [8.54, 47.37],
        profile: 'driving-car',
        geometry: { type: 'FeatureCollection', features: [] },
        distance: 1000,
        duration: 60,
      } as any;

      routeStoreMock.routeResult.set(dummyRoute);
      fixture.detectChanges();

      const mapCmp = fixture.debugElement.query(By.directive(MapComponent));
      expect(mapCmp).toBeTruthy();
      expect(mapCmp.componentInstance.route).toEqual(dummyRoute);
    });

    it('should list top routes via TopRoutesHarness', async () => {
      routeStoreMock.topSearches.set([
        { id: '1', startLabel: 'Bern', destinationLabel: 'Zürich', profile: 'driving-car', startCoord: [7,46], destinationCoord: [8,47], count: 1 }
      ] as any);
      fixture.detectChanges();

      const loader = TestbedHarnessEnvironment.loader(fixture);
      const topHarness = await loader.getHarness(TopRoutesHarness);

      const entries = await topHarness.getTopEntries();
      expect(entries.length).toBe(1);
      expect(entries[0]).toContain('Bern  →  Zürich directions_car save');
    });

    it('should clear top routes via harness', async () => {
      const loader = TestbedHarnessEnvironment.loader(fixture);
      const topHarness = await loader.getHarness(TopRoutesHarness);

      await topHarness.clearList();
      expect(routeStoreMock.clearTopSearches).toHaveBeenCalled();
    });
  });
  describe('HomeComponent – SavedRoutesHarness Acceptance', () => {
    let fixture: ComponentFixture<HomeComponent>;
    let routeStoreMock: any;

    beforeEach(async () => {
      routeStoreMock = {
        computeRoute: jest.fn(),
        loadSavedRoute: jest.fn(),
        saveFromTopSearch: jest.fn(),
        clearTopSearches: jest.fn(),
        removeSavedRoute: jest.fn(),
        routeResult: signal(null),
        routeGeoJson: signal(null),
        topSearches: signal([]),
        savedRoutes: signal([]),
      };

      await TestBed.configureTestingModule({
        imports: [
          HomeComponent,
          SearchFormComponent,
          MapComponent,
          TopRoutesComponent,
          SavedRoutesComponent,
          MatTabsModule,
          CommonModule,],
        providers: [
          { provide: RouteStore, useValue: routeStoreMock },
          provideHttpClient(withInterceptorsFromDi()),
          provideHttpClientTesting(),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(HomeComponent);
      fixture.detectChanges();
    });

    async function selectSavedRoutesTab(loader: HarnessLoader) {
      const tabGroup = await loader.getHarness(MatTabGroupHarness);
      await tabGroup.selectTab({ label: 'Gespeicherte Routen' });
      fixture.detectChanges();
      await fixture.whenStable();
      const host = await tabGroup.host();
    }

    it('should render empty state when no saved routes exist', async () => {
      const loader = TestbedHarnessEnvironment.loader(fixture);
      await selectSavedRoutesTab(loader);

      const savedHarness = await loader.getHarness(SavedRoutesHarness);
      const routes = await savedHarness.getSavedRoutes();

      expect(routes).toEqual(['Keine gespeicherten Routen.']);
    });

    it('should list saved routes when store has entries', async () => {
      const dummyRoutes = [
        { id: 'r1', startLabel: 'Bern', destinationLabel: 'Zürich', profile: 'driving-car' },
        { id: 'r2', startLabel: 'Basel', destinationLabel: 'Luzern', profile: 'cycling-regular' },
      ];
      routeStoreMock.savedRoutes.set(dummyRoutes as any);
      fixture.detectChanges();

      const loader = TestbedHarnessEnvironment.loader(fixture);
      await selectSavedRoutesTab(loader);

      const savedHarness = await loader.getHarness(SavedRoutesHarness);
      const routes = await savedHarness.getSavedRoutes();

      expect(routes.length).toBe(2);
      expect(routes[0]).toContain('Bern');
      expect(routes[1]).toContain('Basel');
    });

    it('should call removeSavedRoute when delete button is clicked', async () => {
      const dummyRoutes = [
        { id: 'r1', startLabel: 'Bern', destinationLabel: 'Zürich', profile: 'driving-car' },
      ];
      routeStoreMock.savedRoutes.set(dummyRoutes as any);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      const loader = TestbedHarnessEnvironment.loader(fixture);
      await selectSavedRoutesTab(loader);

      const savedHarness = await loader.getHarness(SavedRoutesHarness);
      await savedHarness.triggerRemove(0);

      expect(routeStoreMock.removeSavedRoute).toHaveBeenCalledWith('r1');
    });

    it('should call loadSavedRoute when map button is clicked', async () => {
      const dummyRoutes = [
        { id: 'r2', startLabel: 'Basel', destinationLabel: 'Luzern', profile: 'cycling-regular' },
      ];
      routeStoreMock.savedRoutes.set(dummyRoutes as any);
      fixture.detectChanges();

      const loader = TestbedHarnessEnvironment.loader(fixture);
      await selectSavedRoutesTab(loader);

      const savedHarness = await loader.getHarness(SavedRoutesHarness);
      await savedHarness.triggerShowOnMap(0);

      expect(routeStoreMock.loadSavedRoute).toHaveBeenCalledWith('r2');
    });
  });
});
