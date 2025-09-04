import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedRoutesComponent } from './saved-routes.component';
import {provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('SavedRoutesComponent', () => {
  let component: SavedRoutesComponent;
  let fixture: ComponentFixture<SavedRoutesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SavedRoutesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
