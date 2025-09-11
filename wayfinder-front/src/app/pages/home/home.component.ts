import {Component, inject} from '@angular/core';
import {SearchFormComponent} from '../../components/search-form/search-form.component';
import {MapComponent} from '../../components/map/map.component';
import {TopRoutesComponent} from '../../components/top-routes/top-routes.component';
import {SavedRoutesComponent} from '../../components/saved-routes/saved-routes.component';
import {MatTabsModule} from '@angular/material/tabs';
import {RouteStore} from '../../services/route-store.service';
import {OrsProfile} from '../../models/ors-profile.model';
import {Suggestion} from '../../services/ors.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [SearchFormComponent, MapComponent, TopRoutesComponent, SavedRoutesComponent, MatTabsModule]
})
export class HomeComponent {
  public routeStore = inject(RouteStore);
  public currentGeoJson = this.routeStore.routeGeoJson;


  findRoute($event: { start: Suggestion; destination: Suggestion; profile: OrsProfile }) {
      this.routeStore.computeRoute(
        $event.start.coord,
        $event.destination.coord,
        $event.profile,
        $event.start.label,
        $event.destination.label
      );

  }

  onShowSavedRoute(routeId: string): void {
    this.routeStore.loadSavedRoute(routeId);
    this.routeStore.topSearches()
  }
}
