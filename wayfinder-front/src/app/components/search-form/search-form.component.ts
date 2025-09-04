import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged, startWith, switchMap, take } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { AsyncPipe } from '@angular/common';

import { OrsService, LngLat, Suggestion } from '../../services/ors.service';
import { RouteResult } from '../../models/route-result.model';
import { RouteQuery } from '../../models/route-query.model';
import {OrsProfile} from '../../models/ors-profile.model';

@Component({
  selector: 'app-search-form',
  standalone: true,
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss'],
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatAutocompleteModule, MatSelectModule, MatIconModule, AsyncPipe
  ]
})
export class SearchFormComponent implements OnInit {
  profiles: Array<{ value: OrsProfile; label: string; icon: string }> = [
    { value: 'driving-car', label: 'Auto', icon:'directions_car' },
    { value: 'driving-hgv', label: 'LKW', icon:'local_shipping' },
    { value: 'cycling-regular', label: 'Fahrrad', icon:'directions_bike' },
    { value: 'cycling-road', label: 'Rennrad', icon:'pedal_bike' },
    { value: 'cycling-mountain', label: 'Mountainbike', icon: 'terrain' },
    { value: 'cycling-electric', label: 'E-Bike', icon:'electric_bike' },
    { value: 'foot-walking', label: 'Zu Fuss', icon:'directions_walk' },
    { value: 'foot-hiking', label: 'Wandern', icon:'hiking' },
    { value: 'wheelchair', label: 'Rollstuhl', icon: 'accessible' },
  ];

  private orsService = inject(OrsService);

  form = new FormGroup({
    startText: new FormControl<string>('', { nonNullable: true }),
    destinationText: new FormControl<string>('', { nonNullable: true }),
    profile: new FormControl<OrsProfile>('driving-car', { nonNullable: true })
  });

  startSuggestions$!: Observable<Suggestion[]>;
  destinationSuggestions$!: Observable<Suggestion[]>;

  private selectedStartSuggestion: Suggestion | null = null;
  private selectedDestinationSuggestion: Suggestion | null = null;

  @Output() routeComputed = new EventEmitter<RouteResult>();

  ngOnInit(): void {
    this.startSuggestions$ = this.form.controls.startText.valueChanges.pipe(
      startWith(this.form.controls.startText.value),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(searchText => searchText?.length ? this.orsService.autocomplete(searchText) : of([]))
    );

    this.destinationSuggestions$ = this.form.controls.destinationText.valueChanges.pipe(
      startWith(this.form.controls.destinationText.value),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(searchText => searchText?.length ? this.orsService.autocomplete(searchText) : of([]))
    );

    // Auswahl zurücksetzen, wenn Text sich ändert
    this.form.controls.startText.valueChanges.subscribe(() => (this.selectedStartSuggestion = null));
    this.form.controls.destinationText.valueChanges.subscribe(() => (this.selectedDestinationSuggestion = null));
  }

  displaySuggestionLabel = (suggestion: Suggestion | string): string =>
    typeof suggestion === 'string' ? suggestion : suggestion?.label ?? '';

  handleStartSelected(event: MatAutocompleteSelectedEvent): void {
    const chosen = event.option.value as Suggestion;
    this.selectedStartSuggestion = chosen;
    this.form.controls.startText.setValue(chosen.label);
  }

  handleDestinationSelected(event: MatAutocompleteSelectedEvent): void {
    const chosen = event.option.value as Suggestion;
    this.selectedDestinationSuggestion = chosen;
    this.form.controls.destinationText.setValue(chosen.label);
  }

  onClear(): void {
    this.form.reset({
      startText: '',
      destinationText: '',
      profile: 'driving-car'
    });
    this.selectedStartSuggestion = null;
    this.selectedDestinationSuggestion = null;
  }

  onSubmit(): void {
    const routeQuery: RouteQuery = {
      start: this.form.controls.startText.value,
      destination: this.form.controls.destinationText.value
    };

    const startCoordinates: LngLat | null        = this.selectedStartSuggestion?.coord ?? null;
    const destinationCoordinates: LngLat | null  = this.selectedDestinationSuggestion?.coord ?? null;
    const chosenProfile: OrsProfile              = this.form.controls.profile.value;

    if (!startCoordinates || !destinationCoordinates) return;

    this.orsService
      .directionsAsRouteResult(startCoordinates, destinationCoordinates, chosenProfile)
      .pipe(take(1))
      .subscribe((routeResult: RouteResult | null) => {
        if (routeResult) {
          const enriched: RouteResult = {
            ...routeResult,
            name: `${routeQuery.start} → ${routeQuery.destination}`
          };
          this.routeComputed.emit(enriched);
        }
      });
  }
}
