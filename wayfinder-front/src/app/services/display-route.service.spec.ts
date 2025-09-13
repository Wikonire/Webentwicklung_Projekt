import { TestBed } from '@angular/core/testing';

import { DisplayRouteService } from './display-route.service';

describe('DisplayRouteService', () => {
  let service: DisplayRouteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DisplayRouteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
