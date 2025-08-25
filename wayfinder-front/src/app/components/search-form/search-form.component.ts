import {Component, EventEmitter, Output, signal} from '@angular/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatListModule} from '@angular/material/list';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {FormControl, ReactiveFormsModule} from '@angular/forms';

@Component({
  selector: 'app-search-form',
  standalone: true,
  templateUrl: './search-form.component.html',
  imports: [MatFormFieldModule, MatListModule, MatInputModule, MatButtonModule, ReactiveFormsModule],
  styleUrl: './search-form.component.scss'
})
export class SearchFormComponent {
  @Output() routeRequested = new EventEmitter<unknown>();

  startControl = new FormControl('');
  endControl = new FormControl('');

  onClear(): void {
    this.startControl.reset();
    this.endControl.reset();
  }

  onSubmit(): void {
    if (this.startControl.invalid || this.endControl.invalid) return;
    const from = this.startControl.value;
    const to = this.endControl.value;
    this.routeRequested.emit({ from, to });
  }

}
