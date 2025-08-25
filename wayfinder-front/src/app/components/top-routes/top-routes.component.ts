import {Component, Input} from '@angular/core';
import {MatListModule} from '@angular/material/list';

@Component({
  selector: 'app-top-routes',
  standalone: true,
  imports: [MatListModule],
  templateUrl: './top-routes.component.html',
  styleUrl: './top-routes.component.scss'
})
export class TopRoutesComponent {

  @Input() topRoutes: Array<{from:string, to:string}> = [];
}
