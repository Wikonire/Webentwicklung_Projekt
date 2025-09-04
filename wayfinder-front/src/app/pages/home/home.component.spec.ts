import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from './home.component';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {OrsService} from '../../services/ors.service';
import {of} from 'rxjs';
import {provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
import {MapComponent} from '../../components/map/map.component';
import {SearchFormComponent} from '../../components/search-form/search-form.component';
import {TopRoutesComponent} from '../../components/top-routes/top-routes.component';
import {SavedRoutesComponent} from '../../components/saved-routes/saved-routes.component';
import {MatTabsModule} from '@angular/material/tabs';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  const orsServiceMock: jest.Mocked<OrsService> = {
    autocomplete: jest.fn().mockReturnValue(of({ features: [] })),
    geocode: jest.fn().mockReturnValue(of({ features: [] })),
    directionsFeatureCollection: jest.fn().mockReturnValue(of({
      name: 'dummy',
      geometry: { type: 'LineString', coordinates: [] },
      distance: 0,
      duration: 0,
    })),
  };

  beforeEach(async () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: jest.fn(() => 'mocked-uuid') },
      writable: true,
    });
    await TestBed.configureTestingModule({
      imports: [HomeComponent, SearchFormComponent, MapComponent, TopRoutesComponent, SavedRoutesComponent, MatTabsModule],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
