import {Component, EventEmitter, Output} from '@angular/core';

@Component({
  selector: 'app-search-form',
  standalone: true,
  templateUrl: './search-form.component.html',
  styleUrl: './search-form.component.scss'
})
export class SearchFormComponent {
  @Output() routeRequested = new EventEmitter<unknown>();

}
