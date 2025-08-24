import { Component } from '@angular/core';
import {SearchFormComponent} from '../../components/search-form/search-form.component';
import {MapComponent} from '../../components/map/map.component';
import {TopRoutesComponent} from '../../components/top-routes/top-routes.component';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [SearchFormComponent, MapComponent, TopRoutesComponent]
})
export class HomeComponent {
  currentRoute: any = null; // GeoJSON
}
