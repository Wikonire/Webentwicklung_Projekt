import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopRoutesComponent } from './top-routes.component';

describe('TopRoutesComponent', () => {
  let component: TopRoutesComponent;
  let fixture: ComponentFixture<TopRoutesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopRoutesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopRoutesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
