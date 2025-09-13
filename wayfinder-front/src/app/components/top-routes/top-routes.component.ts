import { Component, Input, inject } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {AppRoute, TopSearchEntry} from '../../models/routes.model';
import { OrsProfile, profiles } from '../../models/ors-profile.model';
import {RouteStore} from '../../services/route-store.service';
import {DisplayRouteService} from '../../services/display-route.service';

@Component({
  selector: 'app-top-routes',
  standalone: true,
  imports: [MatListModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './top-routes.component.html',
  styleUrls: ['./top-routes.component.scss']
})
export class TopRoutesComponent {
  @Input() topRoutes: TopSearchEntry[] = [];
  private storeService = inject(RouteStore);
  displayHelper = inject(DisplayRouteService);


  save(entry: TopSearchEntry): void {
    if (!entry.startCoord || !entry.destinationCoord) return;
    this.storeService.saveFromTopSearch(entry);
  }

  clear() {
    this.storeService.clearTopSearches()
  }
}
