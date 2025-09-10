import { Component, inject } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouteStore } from '../../services/route-store.service';
import {SavedRoute} from '../../models/route-result.model';
import {MatTooltipModule} from '@angular/material/tooltip';

@Component({
  selector: 'app-saved-routes',
  standalone: true,
  imports: [MatListModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './saved-routes.component.html',
  styleUrls: ['./saved-routes.component.scss']
})
export class SavedRoutesComponent {
  private routeStore = inject(RouteStore);

  savedRoutes = this.routeStore.savedRoutes;

  displayRoute(route: SavedRoute): string {
    return `${route.name}`;
  }

  remove(id: string): void {
    this.routeStore.removeSavedRoute(id);
  }
}
