import { Component } from '@angular/core';
import {SearchFormComponent} from '../../components/search-form/search-form.component';
import {MapComponent} from '../../components/map/map.component';
import {TopRoutesComponent} from '../../components/top-routes/top-routes.component';
import {SavedRoutesComponent} from '../../components/saved-routes/saved-routes.component';
import {MatTabsModule} from '@angular/material/tabs';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [SearchFormComponent, MapComponent, TopRoutesComponent, SavedRoutesComponent, MatTabsModule]
})
export class HomeComponent {
  currentRoute: any = null; // GeoJSON
}
