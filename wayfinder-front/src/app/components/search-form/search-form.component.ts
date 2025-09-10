import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import {debounceTime, distinctUntilChanged, shareReplay, startWith, switchMap, take, tap} from 'rxjs/operators';
import {Observable, of} from 'rxjs';
import { AsyncPipe } from '@angular/common';

import { OrsService, Suggestion } from '../../services/ors.service';
import { RouteResult } from '../../models/route-result.model';
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
    {value: 'driving-car', label: 'Auto', icon: 'directions_car'},
    {value: 'driving-hgv', label: 'LKW', icon: 'local_shipping'},
    {value: 'cycling-regular', label: 'Fahrrad', icon: 'directions_bike'},
    {value: 'cycling-road', label: 'Rennrad', icon: 'pedal_bike'},
    {value: 'cycling-mountain', label: 'Mountainbike', icon: 'terrain'},
    {value: 'cycling-electric', label: 'E-Bike', icon: 'electric_bike'},
    {value: 'foot-walking', label: 'Zu Fuss', icon: 'directions_walk'},
    {value: 'foot-hiking', label: 'Wandern', icon: 'hiking'},
    {value: 'wheelchair', label: 'Rollstuhl', icon: 'accessible'},
  ];
  @Output() findRoute = new EventEmitter<{
    start: Suggestion,
    destination: Suggestion,
    profile: OrsProfile
  }>();
  private orsService = inject(OrsService);

  form = new FormGroup({
    start: new FormControl<string>('', {nonNullable: true}),
    destination: new FormControl<string>('', {nonNullable: true}),
    profile: new FormControl<OrsProfile>('driving-car', {nonNullable: true})
  });

  startSuggestions$!: Observable<Suggestion[]>;
  destinationSuggestions$!: Observable<Suggestion[]>;

  public selectedStartSuggestion: Suggestion | null = null;
  public selectedDestinationSuggestion: Suggestion | null = null;

  ngOnInit(): void {
    this.startSuggestions$ = this.form.controls.start.valueChanges.pipe(
      startWith(this.form.controls.start.value),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(searchText => searchText?.length ? this.orsService.autocomplete(searchText) : of([])),
      shareReplay(2)
    );
    this.destinationSuggestions$ = this.form.controls.destination.valueChanges.pipe(
      startWith(this.form.controls.destination.value),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(searchText => searchText?.length ? this.orsService.autocomplete(searchText) : of([])),
      shareReplay(2)
    );
  }


  handleStartSelected(event: MatAutocompleteSelectedEvent): void {
    const chosen = event.option.value as Suggestion;
    this.selectedStartSuggestion = event.option.value as Suggestion;
    this.form.controls.start.setValue(chosen.label);
  }

  handleDestinationSelected(event: MatAutocompleteSelectedEvent): void {
    const chosen = event.option.value as Suggestion;
    this.selectedDestinationSuggestion = event.option.value as Suggestion;
    this.form.controls.destination.setValue(chosen.label);
  }

  onClear(): void {
    this.form.reset({
      start: '',
      destination: '',
      profile: 'driving-car'
    });
    this.selectedStartSuggestion = null;
    this.selectedDestinationSuggestion = null;
  }

  onSubmit(): void {
    if (this.selectedStartSuggestion && this.selectedDestinationSuggestion) {
      this.findRoute.emit({
        start: this.selectedStartSuggestion,
        destination: this.selectedDestinationSuggestion,
        profile: this.form.controls.profile.value
      });
    }

  }
}
