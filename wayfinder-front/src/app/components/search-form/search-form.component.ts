import {
  Component,
  EventEmitter,
  inject,
  OnInit,
  Output,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import {
  debounceTime,
  distinctUntilChanged,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { AsyncPipe } from '@angular/common';

import { OrsService, Suggestion } from '../../services/ors.service';
import {OrsProfile, profiles} from '../../models/ors-profile.model';
import { AppRoute } from '../../models/routes.model';

/** Validator: prüft, ob eine Suggestion mit Koordinaten übergeben ist */
function suggestionValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as Suggestion | null;
  if (!value || !Array.isArray(value.coord) || value.coord.length !== 2) {
    return { invalidSuggestion: true };
  }
  return null;
}


@Component({
  selector: 'app-search-form',
  standalone: true,
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss'],
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatIconModule,
    AsyncPipe,
  ],
})
export class SearchFormComponent implements OnInit, OnChanges {
  @Input() selectedRoute: AppRoute | null = null; //  Route von außen übergeben

  @Output() findRoute = new EventEmitter<{
    start: Suggestion;
    destination: Suggestion;
    profile: OrsProfile;
  }>();

  private orsService = inject(OrsService);

  profiles = profiles;

  form = new FormGroup({
    start: new FormControl<string | Suggestion | null>(null, {
      validators: [suggestionValidator],
    }),
    destination: new FormControl<string | Suggestion | null>(null, {
      validators: [suggestionValidator],
    }),
    profile: new FormControl<OrsProfile>('driving-car', { nonNullable: true }),
  });

  startSuggestions$!: Observable<Suggestion[]>;
  destinationSuggestions$!: Observable<Suggestion[]>;

  ngOnInit(): void {
    this.startSuggestions$ = this.form.controls.start.valueChanges.pipe(
      startWith(this.form.controls.start.value),
      debounceTime(250),
      distinctUntilChanged(
        (a, b) =>
          (typeof a === 'string' ? a : a?.label) ===
          (typeof b === 'string' ? b : b?.label)
      ),
      switchMap((value) =>
        typeof value === 'string' && value.length
          ? this.orsService.autocomplete(value)
          : of([])
      ),
      shareReplay(2)
    );

    this.destinationSuggestions$ = this.form.controls.destination.valueChanges.pipe(
      startWith(this.form.controls.destination.value),
      debounceTime(250),
      distinctUntilChanged(
        (a, b) =>
          (typeof a === 'string' ? a : a?.label) ===
          (typeof b === 'string' ? b : b?.label)
      ),
      switchMap((value) =>
        typeof value === 'string' && value.length
          ? this.orsService.autocomplete(value)
          : of([])
      ),
      shareReplay(2)
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedRoute'] && this.selectedRoute) {
      const route = this.selectedRoute;
      if (route.startCoord && route.destinationCoord) {
        this.form.patchValue({
          start: {
            id: 'start',
            label: route.start,
            coord: route.startCoord,
          },
          destination: {
            id: 'destination',
            label: route.destination,
            coord: route.destinationCoord,
          },
          profile: route.profile,
        });
      }
    }
  }

  handleStartSelected(event: MatAutocompleteSelectedEvent): void {
    this.form.controls.start.setValue(event.option.value as Suggestion);
  }

  handleDestinationSelected(event: MatAutocompleteSelectedEvent): void {
    this.form.controls.destination.setValue(event.option.value as Suggestion);
  }

  displaySuggestion(suggestion?: Suggestion): string {
    return suggestion ? suggestion.label : '';
  }

  onClear(): void {
    this.form.reset({
      start: null,
      destination: null,
      profile: 'driving-car',
    });
  }

  onSubmit(): void {
    const { start, destination, profile } = this.form.value;
    if (this.form.valid && start && destination) {
      this.findRoute.emit({
        start: start as Suggestion,
        destination: destination as Suggestion,
        profile: profile!,
      });
    }
  }


}
